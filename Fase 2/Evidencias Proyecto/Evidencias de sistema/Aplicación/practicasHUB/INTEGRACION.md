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
