# Bono solidario · Litame PROM91

Tablero digital de 100 boletas (00–99), adaptable a celular y con actualización en vivo mediante Supabase. La reserva guarda nombre y teléfono; el organizador puede marcarla pagada o liberar la boleta para que vuelva a estar disponible.

## Probar ahora en modo demostración

1. Instala Node.js 20 o posterior.
2. Abre una terminal en la carpeta del proyecto y ejecuta `npm install`.
3. Ejecuta `npm run dev` y abre la dirección local que indica Vite (normalmente `http://localhost:5173`).
4. Para abrir el panel del organizador, usa la clave de demostración `demo123`.

El modo demostración guarda los cambios en ese navegador y los comparte entre pestañas abiertas en el mismo dispositivo. Para que varias personas desde sus propios celulares vean las mismas reservas en tiempo real, conecta Supabase siguiendo los pasos de abajo.

## Configurar Supabase para uso compartido

1. Crea un proyecto en [Supabase](https://supabase.com/) y abre **SQL Editor**.
2. Copia y ejecuta `supabase/schema.sql`. Crea las 100 boletas y configura lectura pública, reservas controladas por el servidor y actualizaciones en tiempo real.
3. Copia `.env.example` como `.env` y reemplaza sus valores de ejemplo por los de tu proyecto Supabase. La clave privada del servidor se guarda solo en `.env` y nunca se publica en el navegador ni se sube a GitHub.
4. La clave del panel de administración se generó en `.env`; consúltala con el organizador. Para cambiarla, edita el valor de `ADMIN_PASSWORD` y reinicia el servidor.
5. Detén y vuelve a iniciar `npm run dev`. Verifica que la tarjeta de estado muestre **En vivo** y que puedas reservar y liberar una boleta.

La clave `service_role` solo se usa en el servidor y nunca se publica en el navegador. No compartas ni subas el archivo `.env`.

## Publicar y compartir la página

El enlace `localhost:5173` solo funciona en tu computador. Para compartir un enlace que abra desde otros celulares necesitas publicar la app en un servicio de hosting.

### Opción recomendada: GitHub + Render

GitHub guarda una copia del código; Render la ejecuta y crea el enlace público. Este proyecto ya tiene servidor Node.js, así que Render encaja con la estructura actual.

1. Crea un repositorio **privado** en GitHub y sube los archivos del proyecto. No subas `.env`; ya está excluido por `.gitignore`.
2. En Render, crea un **Web Service** y conecta ese repositorio.
3. Configura **Build command** `npm install && npm run build` y **Start command** `npm start`. Selecciona Node 20 o posterior.
4. En la sección **Environment** de Render agrega estas variables, copiando los valores desde tu `.env` local. Render asigna `PORT` automáticamente; si el formulario lo pide, puedes omitirlo.

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD` (define una contraseña nueva y fuerte para el sitio público)
   - `SESSION_SECRET` (usa un valor aleatorio nuevo)
   - `NODE_ENV` = `production`

5. Pulsa **Deploy**. Render mostrará una dirección `https://...onrender.com`; ese es el enlace que compartes. La primera visita después de estar inactivo puede tardar unos segundos mientras el servicio despierta.

La clave `SUPABASE_SERVICE_ROLE_KEY` y `SESSION_SECRET` son privadas: guárdalas solo en las variables protegidas de Render, nunca en GitHub, en el navegador ni en un mensaje. Después de publicar, verifica el enlace en otro celular y revisa el acceso del organizador.

### ¿Y Cloudflare o GitHub Pages?

GitHub Pages no ejecuta el servidor/API que usa esta app, por lo que subirla allí sola no da el tablero compartido. Cloudflare puede alojarla, pero habría que adaptar el servidor a su plataforma Workers/Pages Functions. Para publicar la versión actual con menos cambios, usa Render; también puedes elegir otro hosting compatible con Node.js.

## Estados y uso

- Verde: disponible y seleccionable.
- Gris: separada; aparece el nombre y el teléfono en administración.
- Azul: pago confirmado por el organizador.
- **Liberar** borra los datos de contacto y devuelve la boleta a disponible.
- Las reservas son atómicas: si otro comprador toma primero una boleta seleccionada, no se guardan reservas parciales.

El panel se abre desde el pie de página con **Acceso del organizador**. En modo compartido, la sesión administrativa dura ocho horas. El pago se coordina directamente con el organizador a través de Nequi `@3133264421`; esta app no procesa pagos.
Actualización para el despliegue
