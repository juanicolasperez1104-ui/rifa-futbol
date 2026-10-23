import { isAdmin, json, supabase } from '../../../_shared/api.js';

export async function onRequestPatch({ request, env, params }) {
  if (!await isAdmin(request, env.SESSION_SECRET)) return json({ error: 'Sesión de organizador vencida. Ingresa de nuevo.' }, 401);
  const number = Number(params.number);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Actualización no válida.' }, 400); }
  const status = body?.status;
  if (!Number.isInteger(number) || number < 0 || number > 99 || !['available', 'paid'].includes(status)) return json({ error: 'Actualización no válida.' }, 400);
  const update = await supabase(env, `raffle_tickets?number=eq.${number}&select=number,status`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
  if (update.error) return json({ error: 'La base de datos no está configurada.' }, 503);
  if (!update.response.ok) {
    console.error('Ticket update failed:', update.response.status, await update.response.text());
    return json({ error: 'No se pudo actualizar la boleta.' }, 500);
  }
  const rows = await update.response.json();
  if (!rows.length) return json({ error: 'No se encontró esa boleta.' }, 404);
  if (status === 'available') {
    const remove = await supabase(env, `raffle_reservations?number=eq.${number}`, { method: 'DELETE' });
    if (remove.error || !remove.response.ok) {
      console.error('Reservation release failed:', remove.response?.status);
      return json({ error: 'La boleta cambió, pero no se pudieron borrar los datos de contacto.' }, 500);
    }
  }
  return json({ ok: true, ticket: rows[0] });
}
