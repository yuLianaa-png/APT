# PrácticasHub
Seguimiento de prácticas laborales y profesionales, en un solo lugar.

**Versión publicada:** https://practicashub-front.onrender.com
> Corre en el plan gratuito de Render: si nadie la ha usado en los últimos 15 minutos, los servicios tardan 1 a 2 minutos en despertar. Mientras tanto la interfaz muestra «El servidor está iniciando».

## Descripción
**PrácticasHub** resuelve la falta de trazabilidad y comunicación operativa durante el desarrollo de prácticas estudiantiles. Diseñado para estudiantes y docentes guía (especialmente para instituciones como DUOC UC), el sistema centraliza la vinculación de grupos mediante códigos únicos, el registro de jornadas trabajadas (con cálculo automático de horas), la subida de evidencias y la gestión de documentos y entregas con control de versiones. Además, avisa al docente cuando un estudiante se atrasa, mediante **alertas de seguimiento**, y notifica a ambos perfiles cada acción relevante, siempre bajo las reglas académicas establecidas para correcciones y plazos.

## Innovación y valor agregado
***¿Qué problema resuelve?***

Muchos docentes que supervisan prácticas trabajan en más de una institución (la realidad del "docente taxi") y deben lidiar con plataformas institucionales rígidas o que no incluyen las herramientas necesarias para facilitar su día a día. Como resultado, el seguimiento de horas, tareas y correcciones termina convertido en un caos de correos, mensajes de WhatsApp y planillas de Excel propensas a errores.

***¿Qué lo hace diferente?***

PrácticasHub adopta un modelo de adopción directa (B2C) y se posiciona como una herramienta personal, ágil e independiente para el docente. Se diferencia por:

- **Fricción cero y autogestión:** el profesor no depende de soporte técnico ni de coordinación académica para configurar sus cursos o asignar alumnos. Genera un **código de vinculación único** y los estudiantes se inscriben solos en segundos.
- **Portabilidad multisede:** el docente reúne en un solo dashboard a sus grupos de distintos institutos o universidades, sin saltar entre varias intranets.
- **Flujos especializados:** a diferencia de Moodle o Canvas, PrácticasHub no es genérico. Calcula automáticamente las horas efectivas, maneja un flujo de corrección estricto (las jornadas se bloquean pasadas 24 horas) y conserva un historial de documentos y entregas sin sobrescribir versiones.
- **Seguimiento proactivo:** el sistema clasifica a cada estudiante como *Al día*, *Requiere atención* o *En riesgo* según su inactividad, su ritmo frente a la meta y la fecha de término, y envía al docente un aviso diario. El profesor no tiene que revisar alumno por alumno para saber a quién contactar.

***¿Qué valor agrega?***

Independencia, tranquilidad y tiempo recuperado. El docente usa PrácticasHub para su control operativo diario, sin fricciones y con total trazabilidad. Al terminar el semestre solo traspasa el resultado final (aprobación o reprobación) al sistema oficial de la institución, ahorrándose meses de carga administrativa.

## Funcionalidades
| Estudiante | Docente |
|---|---|
| Vincularse a uno o varios grupos con un código | Crear grupos (código generado automáticamente, meta de horas y fecha de término opcional) |
| Registrar jornadas con cálculo automático de horas; no se permiten fechas futuras ni repetidas | Desactivar, reactivar o eliminar grupos (con confirmación) |
| Editar una jornada durante 24 h y, después, solicitar corrección | Habilitar o rechazar correcciones de jornada |
| Adjuntar evidencias opcionales a cada jornada | Ver estudiantes con progreso y alertas, y abrir el detalle de cada uno |
| Descargar documentos y enviar entregas con versiones | Publicar documentos o solicitudes de entrega, cambiar archivos y pedir correcciones |
| Notificaciones generales y por grupo, con contador de no leídas | Notificaciones de cada acción del estudiante y aviso diario de alertas |

Los grupos inactivos quedan en **modo solo lectura** para ambos perfiles.

## Tecnologías
- **Frontend:**
  - React 19 + JavaScript + Vite
  - React Router (navegación por perfil y por grupo)
  - Axios (cliente HTTP con token JWT)
  - Vitest y ESLint (pruebas y calidad de código)
- **Backend:**
  - Java 17 (Spring Boot)
  - Spring Cloud Gateway (API Gateway)
  - Spring Cloud OpenFeign (comunicación entre microservicios)
  - Spring Security, JWT y BCrypt (seguridad y autenticación)
  - Spring Data JPA / Hibernate
- **Base de datos:**
  - PostgreSQL alojada en Supabase (un esquema por microservicio)
- **Infraestructura / herramientas:**
  - Docker y Docker Compose (ejecución local)
  - Supabase Storage (archivos, evidencias y entregas)
  - Render (despliegue, definido en `render.yaml` en la raíz del repositorio)
  - Git y GitHub

## Estructura del proyecto
```
practicasHUB/
├── api-gateway/            Punto de entrada: valida JWT, enruta y agrega la clave interna
├── auth-service/           Usuarios, registro, login y emisión de tokens
├── practice-service/       Grupos, vinculaciones, jornadas, correcciones y alertas
├── document-service/       Documentos, entregas, versiones y evidencias (Supabase Storage)
├── notification-service/   Notificaciones generales, por grupo y no leídas
├── Frontend/
│   └── practicasHUB-front/ Aplicación React (SPA)
├── docker-compose.yml      Levanta el backend en local
├── .env.example            Variables de entorno necesarias
├── INTEGRACION.md          Detalle de la integración frontend ↔ backend, seguridad y alertas
└── DESPLIEGUE.md           Guía de despliegue en Render
```

## Ejecución local
1. **Requisitos previos:**
   - Java 17 o superior.
   - Node.js 20 o superior (para el frontend).
   - Docker y Docker Compose.
   - Maven (solo si deseas compilar los microservicios fuera de Docker).
2. Clona el repositorio:
   ```bash
   git clone https://github.com/yuLianaa-png/APT.git
   ```
3. En la carpeta `practicasHUB`, copia `.env.example` a `.env` y completa las variables:
   - `JWT_SECRET`: mínimo 32 caracteres.
   - `INTERNAL_SECRET`: puede quedar vacío en local.
   - `SUPABASE_PASSWORD`, `SUPABASE_URL` y `SUPABASE_KEY`: la `SUPABASE_KEY` es la clave *service_role* legacy, que empieza con `eyJ`.
   - `SUPABASE_BUCKET`.
4. Levanta el backend:
   ```bash
   docker-compose up -d --build
   ```
5. Levanta el frontend:
   ```bash
   cd Frontend/practicasHUB-front
   npm install
   npm run dev
   ```
   El frontend lee la URL del backend desde `Frontend/practicasHUB-front/.env`:
   ```
   VITE_API_URL=http://localhost:8080/api
   VITE_USAR_MOCKS=false
   ```
   Con `VITE_USAR_MOCKS=true` funciona sin backend, usando datos simulados en el navegador. Ese modo es solo para desarrollo.

**URLs de acceso (por defecto):**
- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:8080`. Es el único puerto publicado; los microservicios solo son accesibles dentro de la red de Docker.

**Comandos útiles del frontend:** `npm run lint` · `npm test` · `npm run build`

## Despliegue
La aplicación está desplegada en **Render** mediante un *Blueprint* (`render.yaml`):
- 5 servicios web Docker (gateway y microservicios).
- 1 sitio estático para el frontend.
- Grupos de variables para los secretos y Supabase.

Los pasos, los ajustes de memoria para el plan gratuito y los problemas comunes están en [`DESPLIEGUE.md`](DESPLIEGUE.md).

## Integrantes y roles
| Integrante | Rol |
|---|---|
| Yuliana Román Briceño | Desarrolladora backend, base de datos y seguridad |
| Nicolás Fernández Gallardo | Desarrollador frontend |
| Jonatán Barrios | Gestor de documentación y analista QA |

## Metodología
Se utilizó una adaptación de **Scrum** con un enfoque ágil e iterativo, porque permite ajustar las reglas de negocio del MVP de forma incremental y entregar valor funcional en ciclos cortos. La documentación (requerimientos, Product Backlog, Definition of Done, manual funcional, retrospectivas y diagramas) se encuentra en `Fase 2/Evidencias Proyecto/Evidencias de documentación`.

## Arquitectura
El sistema separa el frontend del backend, y el backend está construido con **microservicios** para separar dominios.

- **Frontend (SPA):** aplicación React con dos niveles de navegación por perfil: un dashboard general y un contexto por grupo. Toda la comunicación pasa por una capa de servicios (`src/services/http`) que adapta las respuestas del backend a lo que muestran las pantallas. `api.js` agrega el token JWT y traduce los errores a mensajes claros.
- **API Gateway:** único punto de entrada. Valida el JWT, agrega las cabeceras `X-User-Id` y `X-User-Role` a partir del token (descarta las que envía el cliente), añade la clave interna `X-Internal-Secret` y enruta a cada servicio.
- **Auth Service:** gestiona usuarios, registro, login y generación de tokens JWT. Solo permite los roles Estudiante y Docente.
- **Practice Service:**
  - Administra grupos, códigos, vinculaciones, jornadas y el flujo de corrección.
  - Valida las reglas: fecha única y no futura, plazo de 24 h y grupo activo.
  - Calcula las **alertas de seguimiento** (`PracticeRiskService`) y envía el aviso diario al docente, de lunes a viernes a las 09:00 hora de Chile (`RiskAlertService`).
- **Document Service:**
  - Gestiona documentos del docente, entregas de estudiantes y evidencias, con versionado.
  - Valida tamaño (40 MB) y tipo de archivo, y guarda los archivos en Supabase Storage.
  - Antes de entregar un archivo, consulta a Practice Service si el usuario tiene acceso.
- **Notification Service:** recibe eventos de los demás servicios (Feign) y guarda las notificaciones de cada usuario, generales y por grupo, con contador de no leídas.

**Seguridad entre servicios:** cada microservicio rechaza las solicitudes que no traen la clave interna, y cada usuario solo accede a sus propios datos y a los de sus grupos. Además, las respuestas incluyen solo los datos personales necesarios. Los detalles están en [`INTEGRACION.md`](INTEGRACION.md).

Los diagramas de arquitectura, componentes, clases, secuencia, casos de uso y los modelos de datos (ME y MRE) están en la carpeta de documentación.

---

## Documentación de la API (Endpoints)
Rutas públicas expuestas a través del **API Gateway**. Todas, excepto las de `/api/auth`, requieren `Authorization: Bearer <token>`. El rol entre paréntesis indica quién puede usarla; el backend verifica además que el recurso pertenezca al usuario o a sus grupos.

### Auth Service (`/api/auth` y `/api/users`)
* **`POST /api/auth/register`**: registra un usuario (Estudiante o Docente), cifra su contraseña con BCrypt y devuelve un token JWT.
* **`POST /api/auth/login`**: autentica con correo y contraseña. Devuelve el token JWT y el rol.
* **`GET /api/users/{id}`**: devuelve el perfil del usuario autenticado (solo el propio).

### Practice Service (`/api/groups`, `/api/enrollments`, `/api/logs`)
**Grupos de práctica**
* **`POST /api/groups/create`**: (Docente) crea un grupo con meta de horas y fecha de término opcional, y genera su código único.
* **`GET /api/groups/my-groups`**: (Docente) lista los grupos del profesor.
* **`GET /api/groups/{groupId}`**: detalle de un grupo (docente propietario o estudiante vinculado).
* **`PUT /api/groups/{groupId}/toggle-status`**: (Docente) alterna entre Activo e Inactivo (solo lectura).
* **`PUT /api/groups/{groupId}/end-date`**: (Docente) define o cambia la fecha de término.
* **`DELETE /api/groups/{groupId}`**: (Docente) elimina el grupo junto con sus vinculaciones y jornadas.

**Vinculaciones**
* **`GET /api/enrollments/preview/{groupCode}`**: (Estudiante) muestra los datos del grupo antes de confirmar la vinculación.
* **`POST /api/enrollments/join/{groupCode}`**: (Estudiante) se vincula al grupo con el código.
* **`GET /api/enrollments/my-enrollments`**: (Estudiante) lista sus prácticas con horas, jornadas y solicitudes pendientes.
* **`GET /api/enrollments/group/{groupId}/students`**: (Docente) lista los estudiantes del grupo con progreso, última jornada y nivel de alerta.

**Jornadas (logs)**
* **`POST /api/logs/enrollment/{enrollmentId}`**: (Estudiante) registra una jornada y calcula las horas efectivas.
* **`GET /api/logs/enrollment/{enrollmentId}`**: lista las jornadas de una vinculación (el estudiante dueño o su docente).
* **`GET /api/logs/enrollment/{enrollmentId}/dashboard`**: (Estudiante) horas registradas frente a la meta.
* **`GET /api/logs/{logId}`**: detalle de una jornada.
* **`PUT /api/logs/{logId}`**: (Estudiante) edita una jornada durante las primeras 24 h o cuando la corrección está habilitada.
* **`PUT /api/logs/{logId}/request-correction`**: (Estudiante) solicita corregir una jornada bloqueada.
* **`PUT /api/logs/{logId}/enable-correction`**: (Docente) habilita la corrección con una observación.
* **`PUT /api/logs/{logId}/reject-correction`**: (Docente) rechaza la solicitud con un comentario.

### Document Service (`/api/documents`)
* **`POST /api/documents/group`**: (Docente) publica un documento informativo o una solicitud de entrega.
* **`PUT /api/documents/group/{groupDocumentId}/replace`**: (Docente) reemplaza el archivo publicado y conserva la versión anterior.
* **`GET /api/documents/group/{groupId}`**: documentos vigentes del grupo.
* **`GET /api/documents/group/{groupId}/history`**: todas las versiones de los documentos del grupo.
* **`POST /api/documents/submission`**: (Estudiante) envía una entrega para un documento.
* **`GET /api/documents/submission/{enrollmentId}`**: entregas vigentes de una vinculación.
* **`GET /api/documents/submission/{enrollmentId}/history`**: historial de versiones de las entregas de una vinculación.
* **`GET /api/documents/submission/group/{groupId}/history`**: (Docente) todas las entregas del grupo.
* **`PUT /api/documents/submission/{submissionId}/request-correction`**: (Docente) solicita corregir una entrega.
* **`POST /api/documents/evidence`**: (Estudiante) adjunta una evidencia a una jornada propia.
* **`GET /api/documents/evidence/{logId}`**: evidencias de una jornada.
* **`GET /api/documents/evidence/enrollment/{enrollmentId}`**: evidencias de todas las jornadas de una vinculación.

### Notification Service (`/api/notifications`)
Cada usuario solo puede consultar sus propias notificaciones.
* **`GET /api/notifications/user/{userId}`**: notificaciones generales de todos sus grupos.
* **`GET /api/notifications/user/{userId}/group/{groupId}`**: notificaciones de un grupo.
* **`GET /api/notifications/user/{userId}/unread-count`**: cantidad de no leídas (contador del menú).
* **`GET /api/notifications/user/{userId}/group/{groupId}/unread-count`**: no leídas de un grupo.
* **`PUT /api/notifications/user/{userId}/mark-read`**: marca todas como leídas.
* **`PUT /api/notifications/user/{userId}/group/{groupId}/mark-read`**: marca como leídas las de un grupo.

### Endpoints internos
Solo se usan entre microservicios mediante Feign y la clave interna: no se exponen para el frontend.
* **Notificaciones:** `POST /api/notifications/send` y `/send-bulk`.
* **Vinculaciones:** `/api/enrollments/group/{id}/student-ids`, `/api/enrollments/{id}/student-id` y `/api/enrollments/{id}/group-id`.
* **Jornadas:** `/api/logs/{id}/enrollment-id` y `/api/logs/enrollment/{id}/ids`.
