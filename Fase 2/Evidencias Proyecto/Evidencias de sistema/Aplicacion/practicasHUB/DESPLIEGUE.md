# Despliegue en Render (plan gratis)

Todo se crea desde `render.yaml`: 5 microservicios (Docker) y el front (sitio estático).

## 0. Antes de empezar
- `render.yaml` tiene que estar en la **raíz del repositorio** (la carpeta `APT`, donde está `.git`).
  Sus rutas `rootDir` parten desde ahí: `Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicacion/practicasHUB/...`
- Ten a mano: la contraseña de la base de datos de Supabase, la URL del proyecto
  (`https://xxxx.supabase.co`) y la clave **service_role** (empieza con `eyJ`).

## 1. Subir los cambios a GitHub
```bash
git add .
git commit -m "Preparar despliegue en Render"
git push
```
Revisa que **no** se suba el `.env` (está en `.gitignore`). Como referencia queda `.env.example`.

## 2. Crear el Blueprint
1. Render → **New** → **Blueprint** → elegir el repositorio.
2. Render muestra los 6 servicios y pide los valores marcados con `sync: false`:
   `SUPABASE_PASSWORD`, `SUPABASE_URL` y `SUPABASE_KEY`.
3. **Apply**. La primera compilación de cada microservicio tarda varios minutos (Maven
   descarga dependencias). Es normal.

`JWT_SECRET` e `INTERNAL_SECRET` los genera Render: no hay que inventarlos.

## 3. Revisar las URLs asignadas (importante)
`render.yaml` asume estas direcciones:

| Servicio | URL esperada |
|---|---|
| Front | `https://practicashub-front.onrender.com` |
| Gateway | `https://practicashub-gateway.onrender.com` |
| Auth | `https://practicashub-auth.onrender.com` |
| Prácticas | `https://practicashub-practice.onrender.com` |
| Documentos | `https://practicashub-document.onrender.com` |
| Notificaciones | `https://practicashub-notification.onrender.com` |

Si Render le puso un sufijo a alguno (por ejemplo `practicashub-auth-x1y2`), corrige la variable
que apunta a él en **Environment** del servicio que la usa:

| Si cambió… | Corregir en… |
|---|---|
| auth | gateway, practice, document → `AUTH_SERVICE_URL` |
| practice | gateway, document → `PRACTICE_SERVICE_URL` |
| document | gateway → `DOCUMENT_SERVICE_URL` |
| notification | gateway, practice, document → `NOTIFICATION_SERVICE_URL` |
| gateway | front → `VITE_API_URL` (termina en `/api`) y **volver a desplegar el front** |
| front | gateway → `CORS_ALLOWED_ORIGINS` |

## 4. Probar
1. Abre el front. La primera vez puede tardar 1 o 2 minutos: los servicios gratis se
   "duermen" tras 15 minutos sin uso y despiertan con la primera petición.
2. Regístrate, crea un grupo, vincúlate con otra cuenta, registra una jornada, sube un archivo.

**Antes de una presentación:** abre la app 3 o 4 minutos antes y navega un poco, para que
los 5 servicios estén despiertos.

## Problemas comunes
| Síntoma | Causa | Qué hacer |
|---|---|---|
| Al llamar directo a un microservicio responde `ACCESO DENEGADO.` | Es lo esperado: solo aceptan peticiones del gateway | Usar siempre la URL del gateway |
| Todo da `ACCESO DENEGADO.` también desde el front | Los servicios tienen distinto `INTERNAL_SECRET` | Que todos usen el grupo `practicashub-secretos` |
| Error de CORS en la consola del navegador | `CORS_ALLOWED_ORIGINS` no tiene la URL exacta del front | Corregirla en el gateway (sin `/` al final) |
| 404 al recargar una página del front | Falta la regla de reescritura | Front → Redirects/Rewrites: `/*` → `/index.html`, tipo Rewrite |
| Un servicio se reinicia solo (`Out of memory`) | 512 MB es justo para Spring Boot | Revisar que tenga `JAVA_TOOL_OPTIONS` del grupo `practicashub-java` |
| Error 500 al subir archivos | Clave de Supabase | `SUPABASE_KEY` debe ser la service_role (`eyJ...`) |

## Desarrollo local
Nada cambia: `docker-compose up -d --build` sigue funcionando igual. Todas las variables
nuevas tienen como valor por omisión lo que usa Docker en local, y si `INTERNAL_SECRET`
no está en tu `.env`, la clave interna no se exige.
