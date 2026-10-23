import { json, supabase } from '../_shared/api.js';

export async function onRequestPost({ request, env }) {
  try {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Revisa el nombre, teléfono y las boletas seleccionadas.' }, 400); }
  const name = String(body?.name || '').trim();
  const phone = String(body?.phone || '').trim();
  const numbers = body?.numbers;
  if (!name || name.length > 80 || !phone || phone.length > 30 || !Array.isArray(numbers) || !numbers.length || numbers.length > 10 || numbers.some(n => !Number.isInteger(n) || n < 0 || n > 99) || new Set(numbers).size !== numbers.length) {
    return json({ error: 'Revisa el nombre, teléfono y las boletas seleccionadas (máximo 10 por reserva).' }, 400);
  }
  const result = await supabase(env, 'rpc/reserve_raffle_tickets', {
    method: 'POST', body: JSON.stringify({ p_numbers: numbers, p_name: name, p_phone: phone }),
  });
  if (result.error) return json({ error: 'La base de datos no está configurada.' }, 503);
  if (!result.response.ok) {
    const detail = await result.response.text();
    console.error('Reservation failed:', result.response.status, detail);
    return result.response.status === 409 || /already taken|one or more tickets/i.test(detail)
      ? json({ error: 'Una o más boletas ya fueron tomadas. Actualizamos el tablero; selecciona otras.' }, 409)
      : json({ error: 'No se pudo guardar la reserva. Intenta de nuevo.' }, 500);
  }
  // PostgREST may return an empty successful body for some RPC configurations.
  // Do not turn a saved reservation into an unhandled JSON parse error.
  const payload = await result.response.text();
  let tickets = [];
  if (payload) {
    try { tickets = JSON.parse(payload); }
    catch { console.error('Reservation RPC returned a non-JSON success response.'); }
  }
  return json({ ok: true, tickets });
  } catch (error) {
    console.error('Reservation request failed:', error?.message || 'Unknown error');
    return json({ error: 'No se pudo confirmar la respuesta del servidor. Actualiza el tablero y verifica si la boleta quedó separada antes de volver a intentarlo.' }, 500);
  }
}
