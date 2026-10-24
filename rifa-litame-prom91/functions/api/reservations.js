import { json, supabase } from '../_shared/api.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Revisa el nombre, teléfono y las boletas seleccionadas.' }, 400); }
  const name = String(body?.name || '').trim();
  const phone = String(body?.phone || '').trim();
  const numbers = body?.numbers;
  if (!name || name.length > 80 || !phone || phone.length > 30 || !Array.isArray(numbers) || !numbers.length || numbers.length > 10 || numbers.some(n => !Number.isInteger(n) || n < 0 || n > 99) || new Set(numbers).size !== numbers.length) {
    return json({ error: 'Revisa el nombre, teléfono y las boletas seleccionadas (máximo 10 por reserva).' }, 400);
  }

  // Cualquier excepción se convierte en JSON: antes, un fallo aquí devolvía una página de error
  // de Cloudflare (no JSON) y el navegador mostraba un mensaje confuso.
  let stage = 'llamada a la base de datos';
  try {
    const result = await supabase(env, 'rpc/reserve_raffle_tickets', {
      method: 'POST', body: JSON.stringify({ p_numbers: numbers, p_name: name, p_phone: phone }),
    });
    if (result.error) return json({ error: `La base de datos no está configurada: ${result.error}` }, 503);
    if (!result.response.ok) {
      const detail = await result.response.text();
      console.error('Reservation failed:', result.response.status, detail);
      return result.response.status === 409 || /already taken|one or more tickets/i.test(detail)
        ? json({ error: 'Una o más boletas ya fueron tomadas. Actualizamos el tablero; selecciona otras.' }, 409)
        : json({ error: `No se pudo guardar la reserva (Supabase respondió ${result.response.status}). Intenta de nuevo.` }, 500);
    }
    // PostgREST puede devolver un cuerpo vacío en una respuesta exitosa: no tratarlo como fallo.
    stage = 'lectura de la respuesta';
    const payload = await result.response.text();
    let tickets = numbers;
    if (payload) {
      try { tickets = JSON.parse(payload); }
      catch { console.error('Reservation RPC returned a non-JSON success response.'); }
    }
    return json({ ok: true, tickets });
  } catch (error) {
    // Solo el tipo de error: el mensaje puede contener valores secretos de la configuración.
    const reason = String(error?.name || 'Error');
    console.error(`Reservation crashed during ${stage}:`, reason);
    return json({
      error: `No se pudo confirmar la reserva (falló la ${stage}). Actualiza el tablero antes de volver a intentarlo.`,
      reason,
    }, 502);
  }
}
