# Actualización para que la rifa cargue rápido con Cloudflare Pages

Esta actualización agrega las funciones de servidor para que Cloudflare Pages pueda alojar la página sin depender del servidor gratuito de Render, que se duerme cuando no recibe visitas. Conserva Supabase y las tablas actuales. El enlace actual de Render sigue funcionando mientras configuras el nuevo.

## 1. Agregar las funciones al repositorio existente

1. Descarga y extrae `cloudflare-actualizacion-lista.zip`.
2. En GitHub abre el repositorio `rifa-futbol` y entra en la carpeta `rifa-litame-prom91`.
3. Agrega la carpeta `functions` completa en ese nivel, junto a `src`, `server`, `supabase` y `package.json`. Debe quedar `rifa-litame-prom91/functions/api/...`.
4. Guarda los cambios con el mensaje `Agregar funciones para Cloudflare`.

No reemplaces ni borres `server`, `src`, `supabase` o `package.json`. No subas `.env`.

## 2. Crear la página en Cloudflare Pages

1. Entra a https://dash.cloudflare.com/ y abre **Workers & Pages**.
2. Elige **Create application > Pages > Connect to Git** y selecciona GitHub y el repositorio `rifa-futbol`.
3. En la configuración del proyecto usa:
   - **Production branch:** `main`
   - **Root directory:** `rifa-litame-prom91`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Configura las variables de compilación `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores actuales de tu `.env`.
5. En **Settings > Variables and Secrets**, agrega las variables privadas que usan las funciones:
   - `SUPABASE_URL` — la URL del proyecto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY` — copia el valor actual de `.env`; es secreto.
   - `ADMIN_PASSWORD` — la contraseña del panel de administración. Puedes mantener la que ya tienes en Render.
   - `SESSION_SECRET` — conserva el valor secreto de `.env` o usa uno aleatorio largo nuevo.
6. Guarda y espera a que Pages termine el primer despliegue. Abre la URL que Cloudflare te muestra y comprueba el tablero y el acceso de organizador.

## 3. Cuando confirmes que la versión nueva funciona

Comparte la URL de Cloudflare. Puedes conservar el servicio de Render como respaldo. El enlace de Render seguirá teniendo su demora inicial del plan gratis.

## Importante

- No subas ni compartas `.env` o `SUPABASE_SERVICE_ROLE_KEY`.
- No es necesario volver a ejecutar `supabase/schema.sql`; la base actual se conserva.
- Cloudflare usa las funciones en `functions/` para las rutas `/api/...`; el navegador sigue leyendo el tablero y los cambios en vivo desde Supabase.

Documentación oficial: https://developers.cloudflare.com/pages/functions/ y https://developers.cloudflare.com/pages/configuration/build-configuration/.
