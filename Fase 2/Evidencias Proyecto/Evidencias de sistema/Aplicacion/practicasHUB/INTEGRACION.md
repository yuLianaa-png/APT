# Integración frontend ↔ backend

El frontend ya no usa datos simulados: con `VITE_USAR_MOCKS=false` todas las pantallas hablan con el
API Gateway (`http://localhost:8080/api`).

## Cómo está armado

```
Pantallas (pages/)  →  services/*.service.js  →  services/http/index.js  →  API Gateway :8080  →  microservicios
                                              ↘  services/mock/  (solo si VITE_USAR_MOCKS=true)
```

Toda la "traducción" vive en **`Frontend/practicasHUB-front/src/services/http/index.js`**:
convierte las respuestas del backend (inglés, ids numéricos) a la forma que esperan las pantallas
(la misma que devuelve el mock), y los datos del formulario al formato del backend.
Ninguna pantalla se modificó.

Otros cambios del front:
- `services/api.js`: los errores del backend se convierten en `{ codigo, mensaje }` (lo que leen las
  pantallas). Solo un **401** cierra la sesión; antes también lo hacía un 403, y el backend usa 403
  para reglas de negocio.
- `context/AuthContext.jsx`: el id del usuario guardado se normaliza a texto.
- `.env`: se agregó `VITE_API_URL`.

## Cambios en el backend

### auth-service
| Cambio | Motivo |
|---|---|
| `User.password` con `@JsonProperty(WRITE_ONLY)` | `GET /api/users/{id}` devolvía el hash de la contraseña |
| `SecurityConfig`: `/api/users/**` permitido | El front necesita nombres de estudiantes y docentes (el gateway ya valida el token) |
| `UserService.RegisterUser`: rol en mayúsculas y solo `ESTUDIANTE` / `PROFESOR` | Los controladores comparan el rol con esos valores |

### api-gateway
- `AuthenticationFilter` leía el claim `id`, pero el token trae `userId`.

### practice-service
| Endpoint nuevo | Uso |
|---|---|
| `GET /api/logs/enrollment/{enrollmentId}` | Historial de jornadas (estudiante dueño o docente del grupo) |
| `GET /api/logs/{logId}` | Detalle de una jornada |
| `GET /api/enrollments/group/{groupId}/students` | Padrón del docente con horas, jornadas y solicitudes |
| `GET /api/enrollments/preview/{groupCode}` | Vista previa del grupo antes de vincularse |

Además:
- `PracticeLog.mainActivity` (columna `main_activity`): el front pide "actividad principal" aparte de la descripción.
- `StudentEnrollmentDTO` agrega `totalLogs`, `pendingRequests` y `groupCreationDate`.
- Dashboard: `pendingRequests` contaba `status = PENDIENTE` (no existe); ahora cuenta `requestStatus = Pendiente`. `enabledCorrections` cuenta las `OBSERVADA`.
- `requestCorrection` rechaza una segunda solicitud si ya hay una pendiente.
- Editar / solicitar / habilitar / rechazar verifican que la jornada sea del usuario (o de un grupo del docente).
- Al guardar una corrección habilitada se notifica al docente (`CORRECTION_SAVED`).
- Tipos de notificación separados: `CORRECTION_ENABLED` y `CORRECTION_REJECTED` (antes ambos eran `CORRECTION_REPLY`).

### document-service
| Endpoint nuevo | Uso |
|---|---|
| `GET /api/documents/group/{groupId}/history` | Todas las versiones de los documentos (historial) |
| `GET /api/documents/submission/group/{groupId}/history` | Docente: todas las entregas del grupo |
| `GET /api/documents/submission/{enrollmentId}/history` | Todas las versiones de las entregas de un estudiante |
| `GET /api/documents/evidence/batch?logIds=1,2,3` | Evidencias de muchas jornadas en una consulta |

Además:
- `GroupDocument.title` (nombre visible; `name` sigue siendo el nombre del archivo) y `rootDocumentId`
  (id de la primera versión, común a todas). `POST /api/documents/group` acepta `title` opcional.
- Las entregas se asocian a la **primera versión** del documento, así un reemplazo del docente no
  "borra" las entregas ni permite volver a entregar. `DocumentSubmission.documentVersion` guarda la
  versión del documento que el estudiante usó.

### notification-service
- `Notification.referenceId` (+ parámetro opcional en `/send` y `/send-bulk`): id de la jornada o
  documento, para que el botón **Ver** abra el elemento correcto. Los Feign clients de practice y
  document lo envían.

Las columnas nuevas las crea Hibernate solo (`ddl-auto=update`).

## Cómo levantarlo

```bash
# backend
docker-compose up -d --build

# frontend
cd Frontend/practicasHUB-front
npm install
npm run dev     # http://localhost:5173 (es el origen permitido en CorsConfig)
```

Después de actualizar, **cierra sesión y vuelve a entrar** para que se guarde la sesión con el formato nuevo.

## Notas
- Las fechas `LocalDateTime` del backend se interpretan como UTC (así corren los contenedores). Si
  levantas los servicios desde IntelliJ en Windows, las horas mostradas se verán desplazadas 3 h.
- El backend no guarda el tamaño de los archivos, así que la interfaz muestra "0 B".
- El historial de solicitudes de corrección guarda solo la vigente por jornada.
- `src/api/axiosConfig.js` no lo usa nadie (el cliente real es `src/services/api.js`).
- Respaldo de todo el código anterior: `_respaldo_antes_integracion.tar.gz`.

## Seguridad (control de acceso)

### Cómo funciona
1. El **api-gateway** valida el JWT y agrega `X-User-Id` y `X-User-Role` a cada petición
   (sobrescribe cualquier valor que mande el cliente).
2. Cada microservicio **toma la identidad solo de esas cabeceras**, nunca de la URL ni del cuerpo,
   y comprueba que el recurso sea del usuario:
   - Estudiante → solo sus inscripciones, jornadas, evidencias, entregas y notificaciones.
   - Docente → solo los grupos que creó y lo que hay dentro de ellos.
3. Los endpoints **internos** (los que se llaman entre microservicios por Feign) rechazan
   cualquier petición que traiga `X-User-Id`, porque eso significa que vino de un usuario.
4. En `docker-compose.yml` **solo el gateway publica su puerto (8080)**. Los microservicios usan
   `expose`, así que no se puede llegar a ellos saltándose el gateway. Esto es lo que hace seguro
   el punto 3: si los puertos estuvieran publicados, cualquiera podría inventar las cabeceras.

> Para probar un microservicio directo con Postman, cambia temporalmente su `expose` por
> `ports`. No lo dejes así al desplegar.

### Qué se corrigió
| Problema | Dónde |
|---|---|
| Cualquier usuario podía leer las notificaciones de otro cambiando el id en la URL | notification-service |
| Cualquier usuario podía crear notificaciones falsas (`/send`, `/send-bulk`) | notification-service |
| Ver entregas y evidencias de otro estudiante; adjuntar evidencias o entregar a nombre de otro | document-service |
| Un docente podía publicar, reemplazar o pedir corrección en grupos ajenos | document-service |
| Sin cabecera de rol, varias rutas asumían `PROFESOR` (`defaultValue`) | document / practice |
| `toggle-status` tomaba el docente de la URL: se podía activar/desactivar un grupo ajeno | practice-service |
| `GET /groups/{id}` mostraba el **código de vinculación** de cualquier grupo | practice-service |
| Los puertos 8081–8084 estaban publicados y permitían saltarse el gateway | docker-compose |

### Endpoints internos nuevos (solo entre microservicios)
- `GET /api/enrollments/{enrollmentId}/group-id`
- `GET /api/logs/{logId}/enrollment-id`
- `GET /api/logs/enrollment/{enrollmentId}/ids`

`GET /api/documents/evidence/batch` se reemplazó por `GET /api/documents/evidence/enrollment/{enrollmentId}`.

### Datos personales (minimización)
`GET /api/users/{id}` solo responde con **tu propio perfil** (o a los otros microservicios). Los
nombres y correos de los demás llegan dentro de respuestas que ya están autorizadas:

| Respuesta | Incluye | Quién la puede ver |
|---|---|---|
| `GET /api/enrollments/group/{id}/students` | `studentName`, `studentEmail` | Solo el docente del grupo |
| `GET /api/enrollments/my-enrollments` | `professorName` | Solo el propio estudiante |
| `GET /api/enrollments/preview/{code}` | `professorName` | Quien tiene el código |
| `GET /api/groups/{id}`, `my-groups` | `professorName` (`@Transient`, no se guarda) | Docente dueño o estudiantes vinculados |

Así el correo de un estudiante solo lo ve su docente, y el front ya no hace una llamada por cada nombre.

## Alertas de riesgo

El docente ve un semáforo por estudiante (**Al día / Requiere atención / En riesgo**) en la sección
Estudiantes, en el resumen del grupo y en el detalle de cada estudiante. Además recibe un aviso
diario (lunes a viernes, 09:00 hora de Chile) por cada grupo que tenga estudiantes con alertas.

| Regla | Requiere atención | En riesgo |
|---|---|---|
| Días sin registrar jornadas | 4 o más | 7 o más |
| Ritmo (solo si el grupo tiene **fecha de término**) | Al ritmo actual no llega a la meta | Llega a menos del 80 % de la meta, o el periodo terminó sin alcanzarla |
| Solicitud de corrección sin responder | Más de 2 días | — |

- Si el estudiante ya alcanzó la meta, o el grupo está inactivo, no se evalúan inactividad ni ritmo.
- La primera semana tras vincularse no se evalúa el ritmo (evita falsas alarmas).
- Los umbrales están en `PracticeRiskService` (backend) y en `utils/riesgo.js` (datos simulados).
  **Si se cambia uno, hay que cambiarlo en los dos.**

Backend: `PracticeRiskService` (reglas), `RiskAlertService` (aviso diario, `@EnableScheduling`),
`PracticeGroup.endDate`, `PracticeLog.correctionRequestedAt`, `PUT /api/groups/{id}/end-date`, y los
campos `lastLogDate`, `riskLevel`, `riskReasons` en el padrón.

## Seguimiento de alertas y mensajes

Responde a la pregunta «¿qué pasa si el estudiante no alcanza las horas y quién lo gestiona?». Todo vive en practice-service; el gateway no cambia.

### 1. Aviso temprano al estudiante
- El job diario (lunes a viernes 9:00, America/Santiago) avisa primero al **estudiante** (`RISK_REMINDER`) con sus motivos y las **horas por semana** que necesita para llegar a la meta a tiempo. No repite el aviso antes de 3 días salvo que cambie el nivel.
- El docente solo recibe aviso (`RISK_ALERTS`) cuando hay estudiantes en **riesgo** o alertas **sin gestionar**.
- El resumen del estudiante muestra el mismo aviso, el ritmo semanal y un enlace para escribirle al docente. La alerta por solicitudes sin responder no se le muestra, porque depende del docente.

### 2. Ciclo de vida de cada alerta
- Tablas `risk_follow_ups` y `risk_follow_up_actions`.
- Estados: `ABIERTA` (Sin gestionar) → `EN_SEGUIMIENTO` (el docente registró algo) → `RESUELTA`.
- Se cierra sola, con una acción `CIERRE` automática, si el estudiante vuelve a estar al día; también la puede cerrar el docente.
- Acciones del docente: `CONTACTO`, `ACUERDO` (con fecha de compromiso opcional) y `NOTA`.

### 3. Plan o prórroga
- La vinculación guarda `custom_end_date` (fecha de término individual), `weekly_hours_commitment` y `commitment_since`.
- La fecha individual reemplaza a la del grupo en el cálculo de riesgo.
- Si en los últimos 7 días registró menos horas que las comprometidas, aparece la alerta «No está cumpliendo el plan acordado».
- El estudiante recibe una notificación `FOLLOW_UP_PLAN`.

### 4. Mensajes docente-estudiante
- Tabla `practice_messages`. Solo texto, hasta 2000 caracteres, **cifrado con AES-256-GCM** (la clave es el SHA-256 de `MESSAGE_KEY`).
- Solo participan el estudiante de la vinculación y el docente del grupo. Un grupo inactivo queda en solo lectura.
- La notificación `MESSAGE` nunca incluye el texto.
- Nueva sección **Mensajes** en ambos roles. El botón «Escribirle» aparece en las alertas del resumen y en el detalle del estudiante.

### Endpoints nuevos (`/api/enrollments`)
| Método | Ruta | Rol |
|---|---|---|
| GET | `/{id}/follow-up` | PROFESOR |
| POST | `/{id}/follow-up/actions` `{type, note, commitmentDate}` | PROFESOR |
| PUT | `/{id}/follow-up/resolve` `{note}` | PROFESOR |
| PUT | `/{id}/plan` `{endDate, weeklyHours, note}` | PROFESOR |
| GET / POST | `/{id}/messages` `{content}` | participante |
| GET | `/group/{groupId}/conversations` | PROFESOR |

### Variable de entorno nueva
`MESSAGE_KEY`: va en `.env` en local y en el grupo `practicashub-secretos` en Render (el Blueprint la genera). Si se cambia, los mensajes antiguos ya no se pueden leer.

## Supervisor del centro de práctica (etapa 1: validación de horas)

El supervisor de la empresa valida las jornadas desde un enlace que le llega por correo. **No necesita cuenta.** La validación es un respaldo: las horas cuentan igual para la meta.

### Flujo
1. El estudiante registra a su supervisor en *Datos de la práctica* (nombre, cargo, empresa y correo). El docente puede corregir estos datos y recibe un aviso cuando el estudiante los cambia.
2. Cada lunes a las 9:30 (America/Santiago), cada supervisor con jornadas pendientes recibe un correo con su enlace. No se le repite el correo si se le envió uno hace menos de 6 días.
3. Desde el enlace (`/supervisor/:token`), el supervisor valida u observa cada jornada. Las observaciones deben tener un comentario de 5 a 500 caracteres. El docente y el estudiante reciben una notificación, que no incluye el comentario.
4. En el detalle del estudiante, el docente tiene **Enviar correo ahora** y **Copiar enlace**. Este último sirve para mandar el enlace por WhatsApp o por su propio correo si el de Brevo cae en spam.
5. Si el estudiante corrige una jornada, esta vuelve a quedar pendiente para el supervisor.

### Seguridad del enlace
- El token tiene 256 bits aleatorios. En la tabla `supervisor_access_tokens` solo se guarda su hash SHA-256.
- Vence a los 7 días y sirve para una sola vinculación.
- Deja de servir si cambia el correo del supervisor.
- Si la práctica está inactiva, el enlace solo permite consultar.
- El supervisor no puede ser el estudiante ni el docente: se compara su correo con el de ellos.
- El gateway deja pasar `/api/public/**` sin JWT y **borra** `X-User-Id` / `X-User-Role` de esas peticiones.

### Endpoints nuevos
| Método | Ruta | Quién |
|---|---|---|
| GET / PUT | `/api/enrollments/{id}/supervisor` `{name, position, email, company}` | estudiante de la vinculación o docente del grupo |
| POST | `/api/enrollments/{id}/supervisor/link` | docente |
| POST | `/api/enrollments/{id}/supervisor/send` | docente |
| GET | `/api/public/supervisor/{token}` | supervisor (token) |
| POST | `/api/public/supervisor/{token}/logs` `{validate: [logId], observe: [{logId, comment}]}` | supervisor (token) |
| POST | `/internal/emails` (notification-service) | solo entre microservicios |

### Correo (Brevo)
- notification-service envía los correos por la **API HTTP** de Brevo, no por SMTP, porque Render bloquea los puertos SMTP en el plan gratis.
- Sin `BREVO_API_KEY` el correo no se envía: se muestra en la consola junto con el enlace, para poder probar el flujo en local.
- Al no tener dominio propio, Brevo cambia el remitente y los correos pueden caer en spam. Por eso existe *Copiar enlace*.

### Variables nuevas
| Variable | Servicio | Valor |
|---|---|---|
| `BREVO_API_KEY` | notification-service | Brevo → SMTP & API → API Keys |
| `EMAIL_FROM` | notification-service | remitente verificado en Brevo |
| `FRONTEND_URL` | practice-service | `https://practicashub-front.onrender.com` (en local, `http://localhost:5173`) |

En Render, `BREVO_API_KEY` y `EMAIL_FROM` van en el grupo nuevo `practicashub-correo` (se ingresan a mano), y `FRONTEND_URL` ya viene en `render.yaml`.

## Evaluación del centro de práctica (etapa 2: pautas)

El docente configura, en la sección **Evaluación** de su grupo, cuántas veces evalúa el supervisor y con qué pauta. El envío al supervisor y el formulario que este llena corresponden a la etapa 3.

### Configuración
| Modo | Pautas que se piden |
|---|---|
| `UNA_INTERMEDIA` | `INTERMEDIA` (al 50 % de las horas) |
| `UNA_FINAL` | `FINAL` (al 100 %), como en Duoc |
| `DOS_MISMA` | `AMBAS` (la misma pauta para el 50 % y el 100 %) |
| `DOS_DISTINTAS` | `INTERMEDIA` y `FINAL`, cada una se publica cuando el docente quiera |

El modo deja de poder cambiarse cuando ya se envió alguna evaluación (pauta `locked`).

### Pauta
- **Secciones** (máximo 10), cada una con «cuenta para la nota final».
- **Criterios** (máximo 40):
  - `NOTA`: de 1 a 7, puede admitir «No aplica».
  - `CALCULADO`: promedio de otra sección; no se permiten cadenas de calculados.
  - `ACTIVIDADES`: el supervisor escribe entre el mínimo (1 por defecto) y 30.
  - `TEXTO`: respuesta abierta, sin nota.
- **Ponderaciones** opcionales: en una sección, todos los criterios con nota o ninguno, y deben sumar 100 %.
- **Nota final**: promedio de las secciones finales. Cada sección se calcula ponderada o como promedio simple, donde cada actividad cuenta como un criterio. «No aplica» no cuenta. Escala 1,0 a 7,0.
- **Estados**: `BORRADOR` → `PUBLICADA`. Si la publicada ya se usó, al publicar otra pasa a `REEMPLAZADA` y se conserva. Si no se usó, se reemplaza.
- Las reglas están en `EvaluationTemplateService` (backend) y en `utils/pauta.js` (front). Si se cambia una, hay que cambiar la otra.

### Lectura de plantillas (document-service)
- `POST /api/documents/evaluation-templates/parse` (multipart `file`, solo docentes): devuelve un **borrador** con advertencias. **El archivo no se guarda.**
- **Formatos**: Excel `.xlsx`, Word `.docx` y PDF con texto, hasta 5 MB. Se revisa el contenido real del archivo, no solo la extensión.
- Un PDF sin texto se rechaza («parece escaneado»). `.xls` y `.doc` se rechazan.
- **Qué detecta**:
  - la tabla de notas (columnas 1 a 7, 1 a 10 o conceptos);
  - los criterios hasta la fila «Calificación / Promedio / Total»;
  - las filas vacías dentro de la tabla, que pasan a ser la lista de actividades;
  - los criterios calculados (texto «autocompleta» o una fórmula que apunta al resultado de otra tabla);
  - las instrucciones (el texto largo antes de la primera tabla);
  - la columna de ponderación;
  - los campos «Observaciones / Comentarios».
- Los datos de identificación (nombre, RUT, empresa, firma) se ignoran.
- Dependencias nuevas: `poi-ooxml` 5.4.1 y `pdfbox` 3.0.5.

### Endpoints (practice-service, docente dueño del grupo)
| Método | Ruta |
|---|---|
| GET | `/api/groups/{groupId}/evaluation` |
| PUT | `/api/groups/{groupId}/evaluation/mode` `{mode}` |
| PUT | `/api/groups/{groupId}/evaluation/templates/{slot}` (guarda el borrador) |
| POST | `/api/groups/{groupId}/evaluation/templates/{slot}/publish` |
| DELETE | `/api/groups/{groupId}/evaluation/templates/{slot}/draft` |

Tablas nuevas: `evaluation_templates`, `evaluation_template_sections` y `evaluation_template_items`. Columna nueva: `practice_group.evaluation_mode`.

## Evaluación del supervisor (etapa 3: envío, respuestas y publicación)

### Flujo
1. **Envío automático:** de lunes a viernes a las 9:45 (America/Santiago), cada estudiante que llegó al 50 % o al 100 % de la meta de horas, según el modo del grupo, genera una evaluación y su supervisor recibe un correo con el enlace `/supervisor/evaluacion/:token`. Si la pauta de ese momento no está publicada, la evaluación queda en `ESPERANDO_PAUTA` y el docente recibe un aviso. Al publicar la pauta, las evaluaciones que esperaban se envían de inmediato.
2. **Recordatorios:** si el supervisor no responde, recibe un recordatorio a los 5 días, como máximo 2. Cada correo trae un enlace nuevo que vence a los 7 días.
3. **Formulario del supervisor:** pide notas de 1 a 7, «No aplica» solo donde la pauta lo permite, las actividades (descripción y nota, entre el mínimo y 30) y las respuestas abiertas. Los criterios calculados y la nota se calculan en vivo. **No se puede enviar con campos vacíos**: se revisa en el navegador y en el servidor. Una vez enviada, la evaluación ya no se puede modificar.
4. **Docente:** en el detalle del estudiante ve el estado y la nota de cada evaluación, y tiene *Enviar evaluación ahora*, *Copiar enlace*, *Ver detalle* y *Publicar al estudiante*. En la sección Evaluación tiene la *Vista previa* de cada pauta y el botón para publicar todas las respondidas de un momento.
5. **Estudiante:** no ve nada hasta que el docente publica. Entonces recibe una notificación y la evaluación aparece en el resumen de su práctica.

Al enviar la primera evaluación, la pauta queda **bloqueada**: un cambio posterior crea otra versión, y las evaluaciones ya enviadas conservan la suya.

### Nota
- La misma regla está en `EvaluationGradeCalculator` (Java) y en `calcularNota` de `utils/pauta.js` (front).
- Con la pauta de Duoc, la nota es el promedio de la sección 5: la nota de «Realiza las tareas…», el promedio de la sección 6 y cada actividad.
- Se redondea a un decimal.

### Endpoints
| Método | Ruta | Quién |
|---|---|---|
| GET | `/api/enrollments/{id}/evaluations` | docente (todos los momentos) o estudiante (solo las publicadas) |
| POST | `/api/enrollments/{id}/evaluations/{INTERMEDIA\|FINAL}/send` | docente |
| POST | `/api/enrollments/{id}/evaluations/{momento}/link` | docente |
| POST | `/api/enrollments/{id}/evaluations/{momento}/publish` | docente |
| GET | `/api/groups/{groupId}/evaluation/results` | docente |
| POST | `/api/groups/{groupId}/evaluation/results/{momento}/publish` | docente |
| GET / POST | `/api/public/evaluation/{token}` | supervisor (token) |

Tablas nuevas: `supervisor_evaluations` y `evaluation_answers`. Columna nueva: `supervisor_access_tokens.evaluation_id`.

En el modo simulado del front no hay tarea diaria: la evaluación se envía con «Enviar evaluación ahora» y el enlace aparece en la consola del navegador.
