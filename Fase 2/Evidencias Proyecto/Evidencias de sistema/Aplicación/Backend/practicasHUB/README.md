# PrácticasHub
Seguimiento de prácticas laborales y profesionales, en un solo lugar.

## Descripción
**PrácticasHub** resuelve la falta de trazabilidad y comunicación operativa durante el desarrollo de prácticas estudiantiles. Diseñado para estudiantes y docentes guía (especialmente para instituciones como DUOC UC), el sistema centraliza la vinculación de grupos mediante códigos únicos, el registro de jornadas trabajadas (con cálculo automático de horas), la subida de evidencias, y la gestión de documentos y entregas con control de versiones. Todo bajo un entorno seguro que notifica en tiempo real y permite habilitar o rechazar correcciones según las reglas académicas establecidas.

## Innovación y valor agregado
***¿Qué problema resuelve?***

Muchos docentes que supervisan prácticas suelen trabajar en más de una institución (realidad del "docente taxi") y se ven obligados a lidiar con plataformas institucionales que son rigidas o que no se componene de herramientas necesarias
para facilita el dia a dia al profesor. Como resultado, el seguimiento de horas, tareas y correcciones termina convirtiéndose en un caos de correos electrónicos, mensajes de WhatsApp y planillas de Excel propensas a errores.

***¿Qué lo hace diferente?***

PracticaHUB adopta un modelo de adaptación directa (B2C), posicionandose como una herramienta personal, agil e independiente para el docente. Se diferencia por:

-  **Fricción cero y Autogestión:** El profesor no depende de soporte técnico ni de coordinacion académica para configurar sus cursos o asignar alumnos. Simplemente genera un **código de vinculación único** y los estudiantes se auto-inscriben en segundos.
-  **Portabilidad multisede:** Permite al docente centralizar a sus grupos de estudiantes de distintos institutos o universidades en un solo dashboard, sin tener que saltar entre tres intranets diferentes.
-  **Fuljos hiper-especializados:** A diferencia de Moodle o Canvas, PrácticaHUB no es genérico. Hace el cálculo matemático automático de las horas efectivas, maneja un flujo de corrección estricto (bloqueando la edicín de jornadas pasadas las 24 horas) y conserva un historial inmutable de documentos sin sobrescribir las versiones.

***¿Qué valor agrega?***

Independencia, paz mental y recuperación del tiempo. El docente utiliza PracticaHUB para llevar su control operatico diario sin fricciones ycon total trazabilidad. Una vez finalizado el semestre, simplemente traspasa el resultado final (aprobación/reprobación) al engorroso sistema oficial de la institución, habieéndose ahorrado meses
de carga administrativa cruzada.

## Tecnologías
- **Frontend:**
  - React.js
  - JavaScript
  - Vite
- **Backend:**
  - Java (Spring Boot)
  - Spring Cloud OpenFeign (comunicación entre microservicios)
  - Spring Cloud Gateway (API Gateway)
  - JWT y BCrypt (Seguridad y autenticación)
- **Base de datos:**
  - PostgreSQL (alojada en Supabase)
- **Infraestructura / herramientas:**
  - Docker y Docker Compose (orquestación local)
  - Supabase Storage (almacenamiento de objetos/archivos)
  - Render (plataforma de despliegue prevista)
  - Git y GitHub

## Ejecución local
1. **Requisitos previos:** 
   - Java 17 o superior.
   - Node.js 18+ (para el frontend).
   - Docker y Docker Compose instalados.
   - Maven (si deseas compilar los microservicios manualmente).
2. Clona el repositorio:
   ```bash
   git clone [url del repositorio]
   ```
3. Instalar dependencias:
   - Para el backend, asegúrate de compilar los proyectos (ej: `mvn clean install` en cada microservicio o desde el directorio raíz si es un proyecto multimodular).
   - Para el frontend, ingresa a la carpeta correspondiente y ejecuta `npm install`.
4. Copiar `.env.example` a `.env` y completar las variables (credenciales de Supabase, JWT secret, etc.).
5. Ejecutar la infraestructura:
   ```bash
   docker-compose up -d --build
   ```
   **URLs de acceso (por defecto):**
   - Frontend: `http://localhost:5173`
   - API Gateway: `http://localhost:8080` (enruta hacia los demás microservicios).

## Integrantes y roles
| Integrante | Rol                                               |
|---|---------------------------------------------------|
| Yuliana Román Briceño | Desarrolladora backend, base de datos y seguridad |
| Nicolás Fernández Gallardo | Desarrollador frontend                            |
| Jonatán Barrios | Gestor de documentación y analista QA             |

## Metodología
Se utilizó **Scrum** bajo un enfoque ágil iterativo, debido a que permite adaptar las reglas de negocio del MVP de forma incremental y entregar valor funcional en sprints cortos. La documentación se encuentra en la carpeta `docs/`.

## Arquitectura
El backend está construido bajo una **Arquitectura de Microservicios** para separar dominios y garantizar escalabilidad.
- **API Gateway:** Único punto de entrada. Enruta las peticiones y valida los tokens JWT agregando las cabeceras `X-User-Id` y `X-User-Role`.
- **Auth Service:** Gestiona usuarios, registro, login y generación de tokens JWT.
- **Practice Service:** Administra los grupos de práctica, códigos de vinculación, inscripciones de estudiantes y el registro y estados de las jornadas de trabajo.
- **Document Service:** Centraliza la subida, descarga y versionado de documentos de profesores, evidencias y entregas de estudiantes, conectándose con Supabase Storage.
- **Notification Service:** Recibe eventos (mediante Feign Clients) y almacena/despacha notificaciones a los usuarios en tiempo real.

*(Ver diagrama en `docs/arquitectura.png`)*

---

## Documentación de la API (Endpoints)
A continuación se listan los endpoints principales expuestos a través del **API Gateway**. Las rutas base asumen que se consultan a través del Gateway.

### Auth Service (`/api/auth` y `/api/users`)
* **`POST /api/auth/register`**: Registra un nuevo usuario en la plataforma, cifra su contraseña con BCrypt y devuelve un token JWT.
* **`POST /api/auth/login`**: Autentica al usuario mediante correo y contraseña. Devuelve un token JWT y el rol del usuario (Estudiante o Docente).
* **`GET /api/users/{id}`**: Obtiene la información básica de un usuario registrado a partir de su ID.

### Practice Service (`/api/groups`, `/api/enrollments`, `/api/logs`)
**Grupos de Práctica**
* **`POST /api/groups/create`**: (Docente) Crea un grupo nuevo, definiendo la meta de horas y generando automáticamente un código de vinculación único.
* **`GET /api/groups/my-groups`**: (Docente) Obtiene la lista de todos los grupos administrados por el profesor que realiza la consulta.
* **`PUT /api/groups/{groupId}/toggle-status`**: (Docente) Alterna el estado del grupo entre "Activo" e "Inactivo" (modo solo lectura).
* **`GET /api/groups/{groupId}`**: Devuelve la información detallada de un grupo específico.
* **`DELETE /api/groups/{groupId}`**: Elimina el grupo seleccionado

**Vinculaciones**
* **`POST /api/enrollments/join/{groupCode}`**: (Estudiante) Vincula al estudiante con un grupo de práctica utilizando el código entregado por el profesor.
* **`GET /api/enrollments/my-enrollments`**: (Estudiante) Lista todos los grupos en los que el estudiante está inscrito.

**Jornadas de Práctica (Logs)**
* **`POST /api/logs/enrollment/{enrollmentId}`**: (Estudiante) Registra una nueva jornada de trabajo, calculando automáticamente las horas efectivas (inicio, término, descanso).
* **`GET /api/logs/enrollment/{enrollmentId}/dashboard`**: (Estudiante) Obtiene métricas de progreso (horas registradas vs. requeridas).
* **`PUT /api/logs/{logId}`**: (Estudiante) Edita los datos de una jornada. Solo permitido en las primeras 24 horas o si el profesor habilitó una corrección.
* **`PUT /api/logs/{logId}/request-correction`**: (Estudiante) Envía una solicitud formal al docente para poder modificar una jornada bloqueada.
* **`PUT /api/logs/{logId}/enable-correction`**: (Docente) Habilita la corrección de una jornada de un estudiante, añadiendo un comentario obligatorio.
* **`PUT /api/logs/{logId}/reject-correction`**: (Docente) Rechaza la solicitud de modificación de un estudiante.

### Document Service (`/api/documents`)
* **`POST /api/documents/group`**: (Docente) Sube y publica un documento o plantilla para un grupo específico. Puede ser informativo o requerir entrega.
* **`POST /api/documents/submission`**: (Estudiante) Sube un archivo como respuesta (entrega) a un documento publicado por el profesor.
* **`GET /api/documents/group/{groupId}`**: Obtiene la lista de todos los documentos y solicitudes publicadas en un grupo.
* **`GET /api/documents/submission/{enrollmentId}`**: Obtiene todas las entregas realizadas por un estudiante específico en un grupo.
* **`POST /api/documents/evidence`**: (Estudiante) Adjunta un archivo de respaldo (evidencia) a una jornada de práctica registrada.
* **`PUT /api/documents/submission/{submissionId}/request-correction`**: (Docente) Solicita al estudiante que vuelva a subir su entrega (cambia estado a "Corrección solicitada").
* **`PUT /api/documents/group/{groupDocumentId}/replace`**: (Docente) Actualiza/reemplaza un documento previamente publicado, conservando el historial de versiones (versionado inmutable).

### Notification Service (`/api/notifications`)
* **`GET /api/notifications/user/{userId}`**: Obtiene la lista de notificaciones generales (de todos los grupos) pertenecientes a un usuario.
* **`GET /api/notifications/user/{userId}/group/{groupId}`**: Filtra y devuelve únicamente las notificaciones del usuario correspondientes a un grupo de práctica específico.
* **`GET /api/notifications/user/{userId}/unread-count`**: Devuelve la cantidad de notificaciones no leídas para mostrar la alerta en la interfaz (campanita).
* **`PUT /api/notifications/user/{userId}/mark-read`**: Marca todas las notificaciones pendientes de un usuario como leídas.