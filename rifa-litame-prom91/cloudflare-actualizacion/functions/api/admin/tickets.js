import { isAdmin, json, supabase } from '../../_shared/api.js';

export async function onRequestGet({ request, env }) {
  if (!await isAdmin(request, env.SESSION_SECRET)) return json({ error: 'Sesión de organizador vencida. Ingresa de nuevo.' }, 401);
  const result = await supabase(env, 'raffle_reservations?select=number,name,phone');
  if (result.error) return json({ error: 'La base de datos no está configurada.' }, 503);
  if (!result.response.ok) {
    console.error('Admin ticket list failed:', result.response.status, await result.response.text());
    return json({ error: 'No se pudieron cargar los datos del organizador.' }, 500);
  }
  return json({ tickets: await result.response.json() });
}
