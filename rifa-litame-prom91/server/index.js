import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = Number(process.env.PORT || 3001);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbReady = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const db = dbReady ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
app.use(express.json({ limit: '20kb' }));

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}
function isAdmin(req) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !process.env.SESSION_SECRET) return false;
  const [body, signature] = token.split('.');
  if (!body || !signature) return false;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return false; }
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()).expires > Date.now(); } catch { return false; }
}
const requireDb = (req, res, next) => db ? next() : res.status(503).json({ error: 'La base de datos no está configurada. Sigue los pasos del README.' });
const requireAdmin = (req, res, next) => isAdmin(req) ? next() : res.status(401).json({ error: 'Sesión de organizador vencida. Ingresa de nuevo.' });

app.get('/api/health', (_req, res) => res.json({ database: dbReady }));
app.post('/api/admin/login', (req, res) => {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured || !process.env.SESSION_SECRET) return res.status(503).json({ error: 'Falta configurar ADMIN_PASSWORD y SESSION_SECRET en el servidor.' });
  const provided = String(req.body?.password || '');
  const a = Buffer.from(provided), b = Buffer.from(configured);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Clave incorrecta.' });
  res.json({ token: sign({ expires: Date.now() + 8 * 60 * 60 * 1000 }) });
});

app.post('/api/reservations', requireDb, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const numbers = req.body?.numbers;
  if (!name || name.length > 80 || !phone || phone.length > 30 || !Array.isArray(numbers) || !numbers.length || numbers.length > 10 || numbers.some(n => !Number.isInteger(n) || n < 0 || n > 99) || new Set(numbers).size !== numbers.length) {
    return res.status(400).json({ error: 'Revisa el nombre, teléfono y las boletas seleccionadas (máximo 10 por reserva).' });
  }
  const { data, error } = await db.rpc('reserve_raffle_tickets', { p_numbers: numbers, p_name: name, p_phone: phone });
  if (error) {
    console.error('Reservation failed:', error.message);
    return res.status(error.message?.includes('already') ? 409 : 500).json({ error: error.message?.includes('already') ? 'Una o más boletas ya fueron tomadas. Actualizamos el tablero; selecciona otras.' : 'No se pudo guardar la reserva. Intenta de nuevo.' });
  }
  res.json({ ok: true, tickets: data });
});

app.patch('/api/admin/tickets/:number', requireDb, requireAdmin, async (req, res) => {
  const number = Number(req.params.number);
  const status = req.body?.status;
  if (!Number.isInteger(number) || number < 0 || number > 99 || !['available', 'paid'].includes(status)) return res.status(400).json({ error: 'Actualización no válida.' });
  const { data, error } = await db.from('raffle_tickets').update({ status, updated_at: new Date().toISOString() }).eq('number', number).select('number,status').single();
  if (error) { console.error('Ticket update failed:', error.message); return res.status(500).json({ error: 'No se pudo actualizar la boleta.' }); }
  if (status === 'available') {
    const { error: removeError } = await db.from('raffle_reservations').delete().eq('number', number);
    if (removeError) { console.error('Reservation release failed:', removeError.message); return res.status(500).json({ error: 'La boleta cambió, pero no se pudieron borrar los datos de contacto.' }); }
  }
  res.json({ ok: true, ticket: data });
});

app.get('/api/admin/tickets', requireDb, requireAdmin, async (_req, res) => {
  const { data, error } = await db.from('raffle_reservations').select('number,name,phone');
  if (error) { console.error('Admin ticket list failed:', error.message); return res.status(500).json({ error: 'No se pudieron cargar los datos del organizador.' }); }
  res.json({ tickets: data || [] });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
}
app.listen(port, () => console.log(`Litame raffle server listening on port ${port}${dbReady ? ' (Supabase enabled)' : ''}`));
