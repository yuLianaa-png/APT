import { Boton, InsigniaEstado, Tabla } from '../ui';
import { ESTADO_SOLICITUD } from '../../utils/constants';
import { formatearDescanso, formatearHoras } from '../../utils/horas';
import { formatearFecha } from '../../utils/fechas';
import { accionesDisponibles } from '../../utils/estadoJornada';
import { horasRestantes, puedeEditarDirecto } from '../../utils/plazo';


/// Tabla que muestra el historial de jornadas de un estudiante, con su fecha, actividad principal, horario, descanso, horas efectivas, estado y acciones disponibles. Las acciones dependen del rol del usuario (estudiante o docente) y del estado de la jornada y su solicitud. 

const COLUMNAS = [
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'actividad', titulo: 'Actividad principal' },
  { clave: 'horario', titulo: 'Horario' },
  { clave: 'descanso', titulo: 'Descanso' },
  { clave: 'horas', titulo: 'Horas', numerica: true },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'acciones', titulo: 'Acciones', acciones: true },
];

// Devuelve un texto que indica cuánto tiempo queda para editar la jornada, o null si ya no se puede editar. Se usa en la columna de fecha para mostrar el plazo restante.
const textoPlazo = (jornada, grupo, ahora) => {
  if (!puedeEditarDirecto(jornada, grupo, ahora)) return null;

  const restantes = horasRestantes(jornada, ahora);
  if (restantes <= 0) return null;
  if (restantes < 1) return `${Math.ceil(restantes * 60)} min para editar`;
  return `${Math.floor(restantes)} h para editar`;
};

const TablaJornadas = ({
  jornadas,
  grupo,
  ahora,
  modo = 'estudiante',
  alEditar,
  alSolicitar,
  alModificar,
  alVerEvidencia,
  alRevisarSolicitud,
  idDestacado = null,
  vacio,
}) => (
  <Tabla
    titulo="Historial de jornadas"
    ocultarTitulo
    columnas={COLUMNAS}
    filas={jornadas}
    claveFila={(fila) => fila.id}
    claseFila={(fila) => (fila.id === idDestacado ? 'ph-tabla__fila--destacada' : undefined)}
    vacio={vacio}
    celda={(jornada, columna) => {
      switch (columna.clave) {
        case 'fecha': {
          const plazo = textoPlazo(jornada, grupo, ahora);
          return (
            <span className="ph-celda-principal">
              <strong>{formatearFecha(jornada.fecha)}</strong>
              {plazo && <span className="ph-campo__ayuda">{plazo}</span>}
            </span>
          );
        }
        case 'actividad':
          return (
            <span className="ph-celda-principal">
              <span>{jornada.actividadPrincipal}</span>
              {jornada.evidencia && (
                alVerEvidencia ? (
                  // RF-10: el docente consulta la evidencia desde el historial individual.
                  <button
                    type="button"
                    className="ph-enlace-sutil"
                    onClick={() => alVerEvidencia(jornada)}
                  >
                    {`Ver evidencia: ${jornada.evidencia.nombre}`}
                  </button>
                ) : (
                  <span className="ph-campo__ayuda">{`Evidencia: ${jornada.evidencia.nombre}`}</span>
                )
              )}
            </span>
          );
        case 'horario':
          return `${jornada.horaInicio} a ${jornada.horaTermino}`;
        case 'descanso':
          return formatearDescanso(jornada.descansoMin);
        case 'horas':
          return `${formatearHoras(jornada.horas)} h`;
        case 'estado':
          // §5.8: el estado de la jornada y el de su solicitud son independientes y
          // pueden convivir, así que se muestran los dos.
          return (
            <span className="ph-celda-principal">
              <InsigniaEstado tipo="jornada" estado={jornada.estado} />
              {jornada.solicitud && (
                <InsigniaEstado
                  tipo="solicitud"
                  estado={jornada.solicitud.estado}
                  prefijo="Solicitud"
                />
              )}
            </span>
          );
        case 'acciones': {
          if (modo === 'docente') {
            // §5.8: una jornada Registrada puede tener una solicitud Pendiente. Cuando la
            // hay, la acción es revisarla; si no, solo queda consultar.
            if (jornada.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE) {
              /*
               * Abrir la revisión **no se bloquea** en un grupo inactivo: §5.5 permite al
               * docente consultar jornadas y solicitudes, y le prohíbe solo habilitar
               * correcciones. Lo que se bloquea son las dos decisiones, y de eso se
               * encarga `RevisarSolicitud` con `soloLectura`. Gatear este botón con
               * `accionesDocente.revisarSolicitud` —que responde «¿puede resolver?»—
               * impedía incluso leer el motivo.
               */
              return (
                <Boton
                  tamano="pequeno"
                  onClick={() => alRevisarSolicitud(jornada)}
                >
                  Revisar solicitud
                </Boton>
              );
            }
            return <span className="ph-campo__ayuda">Sin solicitudes</span>;
          }

          const acciones = accionesDisponibles(jornada, grupo, ahora);

          // Qué acción corresponde a esta fila ahora mismo. Si hay una corrección
          // habilitada manda esa; si no, editar dentro del plazo; si no, solicitar.
          if (acciones.modificar.habilitada) {
            return (
              <Boton tamano="pequeno" onClick={() => alModificar(jornada)}>
                Modificar jornada
              </Boton>
            );
          }

          if (acciones.editar.habilitada) {
            return (
              <Boton tamano="pequeno" onClick={() => alEditar(jornada)}>
                Editar
              </Boton>
            );
          }

          return (
            <Boton
              tamano="pequeno"
              variante="secundario"
              bloqueado={!acciones.solicitar.habilitada}
              motivoBloqueo={acciones.solicitar.motivoBloqueo}
              mostrarMotivo={false}
              onClick={() => alSolicitar(jornada)}
            >
              Solicitar corrección
            </Boton>
          );
        }
        default:
          return null;
      }
    }}
  />
);

export default TablaJornadas;
