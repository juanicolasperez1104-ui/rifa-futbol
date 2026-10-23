import { json } from '../_shared/api.js';

export function onRequestGet({ env }) {
  return json({ database: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) });
}
