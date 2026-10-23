import { createAdminToken, json, safePasswordEqual } from '../../_shared/api.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({ error: 'Falta configurar ADMIN_PASSWORD y SESSION_SECRET en el servidor.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Clave incorrecta.' }, 401); }
  if (!safePasswordEqual(body?.password || '', env.ADMIN_PASSWORD)) return json({ error: 'Clave incorrecta.' }, 401);
  return json({ token: await createAdminToken(env.SESSION_SECRET) });
}
