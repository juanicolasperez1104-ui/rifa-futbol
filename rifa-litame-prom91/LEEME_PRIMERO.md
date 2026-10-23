# Publicar la rifa Litame PROM91

## Archivos que vas a subir

Esta carpeta contiene el proyecto listo para publicar. El archivo `.env` con claves privadas NO está incluido. No agregues el `.env` que está en tu computador a GitHub.

## Paso 1: crear el repositorio en GitHub con GitHub Desktop

1. Descarga y abre GitHub Desktop desde https://desktop.github.com/ e inicia sesión con tu cuenta de GitHub.
2. En GitHub Desktop elige **File > New repository**.
3. Nombre: `rifa-litame-prom91`. Elige dónde guardar la carpeta y crea el repositorio.
4. Abre la carpeta que GitHub Desktop acaba de crear. Copia dentro todos los archivos y carpetas de esta entrega (`src`, `server`, `supabase` y los archivos de la raíz).
5. Vuelve a GitHub Desktop. En el resumen escribe `Subir proyecto de la rifa`, pulsa **Commit to main** y luego **Publish repository**.
6. Deja seleccionada la opción **Keep this code private** y pulsa **Publish repository**. El repositorio privado guarda el código; Render publicará la página para participantes.

## Paso 2: publicar la página en Render

1. Entra a https://render.com/ e inicia sesión.
2. Pulsa **New + > Web Service** y conecta GitHub. Autoriza Render a ver el repositorio privado `rifa-litame-prom91`.
3. Selecciona ese repositorio. Configura:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. En **Environment Variables**, agrega estas variables. Para las de Supabase, copia los valores desde tu archivo `.env` local o desde el panel de Supabase. No copies el archivo `.env` entero a GitHub.

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Clave pública anon/publishable del proyecto |
   | `SUPABASE_URL` | La misma URL de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clave privada de servidor de Supabase; mantener secreta |
   | `ADMIN_PASSWORD` | Una contraseña nueva y difícil para administrar la rifa |
   | `SESSION_SECRET` | Un valor aleatorio largo, distinto a la contraseña |
   | `NODE_ENV` | `production` |

5. Pulsa **Create Web Service** y espera que el despliegue termine. Render mostrará una URL terminada en `onrender.com`; comparte esa dirección con los participantes.
6. Abre el enlace desde otro celular y verifica que el tablero muestre **En vivo**. Haz una reserva de prueba y libérala desde **Acceso del organizador**.

## Seguridad

- Nunca publiques `.env` ni compartas `SUPABASE_SERVICE_ROLE_KEY` o `SESSION_SECRET`.
- No uses la contraseña de demostración en la página pública; define una nueva en `ADMIN_PASSWORD` dentro de Render.
- La clave anon/publishable se usa en el navegador; la clave service role solo la usa el servidor.
- El esquema de Supabase está en `supabase/schema.sql`.

## Si algo falla

En Render abre el servicio y revisa **Events** o **Logs**. Confirma que las variables estén guardadas y vuelve a desplegar desde **Manual Deploy > Deploy latest commit**.
