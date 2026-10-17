# Backend de autenticación y perfil

API construida con Express, TypeScript, PostgreSQL y Sequelize. Incluye registro, inicio de sesión con JWT y perfil autenticado.

## Configuración

1. Copia `.env.example` a `.env` o agrega esas variables a tu `.env` existente.
2. Configura las credenciales de PostgreSQL. El `docker-compose.yml` publica PostgreSQL en el puerto `5433`.
3. Sustituye `JWT_SECRET` por un secreto aleatorio privado de al menos 32 caracteres.
4. Instala dependencias y ejecuta:

```sh
npm install
npm run dev
```

Para compilar y ejecutar la versión compilada:

```sh
npm run build
npm start
```

## Rutas

Todas las rutas usan el prefijo `/api`.

### `POST /api/register`

Campos obligatorios: `nombre`, `apellido`, `usuario`, `email` y `password`. La contraseña debe tener entre 8 y 72 bytes. El objeto opcional `profile` acepta `telefono`, `bio` (también `biografia`), `fecha_cumpleanos` (también `cumpleanos` o `fechaCumpleanos`, formato `YYYY-MM-DD`) y `genero`.

```json
{
  "nombre": "Ada",
  "apellido": "Lovelace",
  "usuario": "ada",
  "email": "ada@example.com",
  "password": "una-clave-segura",
  "profile": { "bio": "Perfil de ejemplo" }
}
```

Responde con `201`, un token JWT y el usuario sin la contraseña. Email y usuario duplicados responden `409`.

### `POST /api/login`

Recibe `email` y `password`. Responde con un token JWT y el usuario sin la contraseña.

### `GET /api/profile` y `PUT /api/profile`

Requieren el encabezado `Authorization: Bearer <token>`. El `GET` devuelve el perfil del usuario autenticado. El `PUT` actualiza uno o más campos del perfil; se pueden enviar dentro de `profile` o directamente en el cuerpo. Los perfiles sin datos deben actualizarse enviándolos con este endpoint:

```json
{ "profile": { "bio": "Hola" } }
```

Los tokens duran una hora. Los endpoints anteriores de administración general de usuarios y de historial de contraseñas ya no están disponibles.

### `PUT /api/profile/photo` y `GET /api/profile/photo`

Ambas rutas requieren `Authorization: Bearer <token>`. Para subir la foto, envía el `ByteArray` sin codificar en Base64, con `Content-Type: application/octet-stream` (también acepta JPEG, PNG y WebP). El tamaño máximo es 6 MB. Sequelize guarda directamente los bytes en `user_profiles.bitmap` como PostgreSQL `BYTEA`. La ruta GET devuelve los bytes originales; si todavía no hay foto, responde `404`. El endpoint `GET /api/profile` incluye `profile.foto_disponible`, no los bytes de la imagen.

Al iniciar, el backend renombra la columna anterior `imagen_base64` si existe y convierte los datos Base64 existentes a `BYTEA` para conservar las fotos antiguas.
