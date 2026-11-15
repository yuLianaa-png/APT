import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { useAhora } from '../../hooks/useAhora';
import { useModoLectura } from '../../hooks/useModoLectura';
import { grupoService, jornadaService, solicitudService } from '../../services';
import { ESTADO_JORNADA, ESTADO_SOLICITUD, ETIQUETAS } from '../../utils/constants';
import { ESTADO_FILA, TODOS, filtrarJornadas } from '../../utils/filtros';
import { puedeEditarDirecto } from '../../utils/plazo';
import { formatearHoras } from '../../utils/horas';
import {
  Aviso, Boton, Cargando, EstadoError, EstadoVacio, Filtros, Indicador, Indicadores, Modal,
} from '../../components/ui';
import TablaJornadas from '../../components/jornadas/TablaJornadas';
import RevisarSolicitud from '../../components/jornadas/RevisarSolicitud';
import ResolverSolicitud from '../../components/jornadas/ResolverSolicitud';
import { VistaPrevia } from '../../components/archivos';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de historial individual de un estudiante para el docente. Se accede desde la tabla de estudiantes del grupo.

const HistorialIndividualDocente = () => {
  const { vinculacionId } = useParams();
  const { usuario } = useAuth();
  const { grupo } = useGrupo();
  const { soloLectura } = useModoLectura();
  const [ahora] = useAhora();
  /*
   * RN-16: la acción `Ver` de una notificación no solo carga el grupo, **abre el
   * elemento**. Llega como `?jornada=<id>` y la fila se destaca, para no tener que
   * buscarla a mano entre veinte.
   */
  const [parametros, setParametros] = useSearchParams();
  const jornadaDestacada = parametros.get('jornada');

  const [estado, setEstado] = useState({
    estudiante: null, jornadas: [], indicadores: null, cargando: true, error: null,
  });
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [actividad, setActividad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(TODOS);
  const [evidencia, setEvidencia] = useState(null);
  const [revisando, setRevisando] = useState(null);
  const [resolviendo, setResolviendo] = useState(null);
  const [aplicando, setAplicando] = useState(false);
  const [errorResolucion, setErrorResolucion] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(() => {
    let vigente = true;

    grupoService.estudiantesDelGrupo(grupo.id)
      .then(async (padron) => {
        const estudiante = padron.find((fila) => fila.vinculacionId === vinculacionId);
        if (!estudiante) {
          // RN-18: una vinculación que no pertenece a este grupo no se enseña vacía.
          throw Object.assign(new Error(), {
            mensaje: 'Ese estudiante no está vinculado a este grupo.',
          });
        }

        const [jornadas, indicadores] = await Promise.all([
          jornadaService.listarPorVinculacion(vinculacionId),
          jornadaService.indicadores(estudiante.estudianteId, grupo.id),
        ]);

        if (vigente) {
          setEstado({ estudiante, jornadas, indicadores, cargando: false, error: null });
        }
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            estudiante: null,
            jornadas: [],
            indicadores: null,
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudo cargar el historial.',
          });
        }
      });

    return () => { vigente = false; };
  }, [grupo.id, vinculacionId]);

  useEffect(() => cargar(), [cargar]);

  const visibles = useMemo(
    () => filtrarJornadas(
      estado.jornadas,
      { desde, hasta, actividad, estado: filtroEstado },
      (jornada) => puedeEditarDirecto(jornada, grupo, ahora),
    ),
    [estado.jornadas, desde, hasta, actividad, filtroEstado, grupo, ahora],
  );


  const resolver = async (texto) => {
    const { jornada, accion } = resolviendo;
    setAplicando(true);
    setErrorResolucion(null);

    try {
      if (accion === ESTADO_SOLICITUD.HABILITADA) {
        await solicitudService.habilitar(jornada.id, texto, usuario.id);
        setAviso('Corrección habilitada. La jornada quedó Observada y el estudiante ya puede corregirla.');
      } else {
        await solicitudService.rechazar(jornada.id, texto, usuario.id);
        setAviso('Solicitud rechazada. La jornada sigue registrada y bloqueada, y el estudiante recibió tu comentario.');
      }
      setResolviendo(null);
      setRevisando(null);
      cargar();
    } catch (fallo) {
      setErrorResolucion(fallo?.mensaje ?? 'No se pudo aplicar la decisión.');
    } finally {
      setAplicando(false);
    }
  };

  if (estado.cargando) return <Cargando mensaje="Cargando el historial…" />;

  const base = baseDeGrupo(usuario.rol, grupo.id);

  if (estado.error || !estado.estudiante) {
    return (
      <section className="ph-pila">
        <EstadoError titulo="Historial no disponible" mensaje={estado.error ?? ''} />
        <div className="ph-fila">
          <Link className="ph-boton ph-boton--secundario" to={`${base}/jornadas`}>
            Volver a los estudiantes
          </Link>
        </div>
      </section>
    );
  }

  const { estudiante, indicadores } = estado;
  const hayFiltros = desde !== '' || hasta !== '' || actividad.trim() !== '' || filtroEstado !== TODOS;

  return (
    <section className="ph-pila">
      <div className="ph-fila ph-fila--entre">
        <div>
          <h2>{estudiante.nombre}</h2>
          <p className="ph-tarjeta__apoyo">{estudiante.correo}</p>
        </div>
        <Link className="ph-boton ph-boton--tenue" to={`${base}/jornadas`}>
          ← Volver a los estudiantes
        </Link>
      </div>

      <Indicadores>
        <Indicador
          etiqueta="Horas registradas"
          valor={formatearHoras(indicadores.horasRegistradas)}
          detalle={`de ${formatearHoras(indicadores.metaMinimaHoras)} h de meta mínima`}
          avance={indicadores.porcentaje}
        />
        <Indicador etiqueta="Jornadas registradas" valor={indicadores.totalJornadas} />
        <Indicador
          etiqueta="Solicitudes pendientes"
          valor={indicadores.solicitudesPendientes}
          detalle={indicadores.solicitudesPendientes > 0 ? 'esperando tu respuesta' : 'sin solicitudes'}
        />
        <Indicador
          etiqueta="Correcciones habilitadas"
          valor={indicadores.correccionesHabilitadas}
          detalle={indicadores.correccionesHabilitadas > 0
            ? 'el estudiante puede corregirlas'
            : 'ninguna abierta'}
        />
      </Indicadores>

      {aviso && <Aviso tono="exito" titulo="Listo">{aviso}</Aviso>}

      {jornadaDestacada && (
        <Aviso titulo="Vienes de una notificación">
          La jornada señalada aparece destacada en el historial.
          {' '}
          <button
            type="button"
            className="ph-enlace-sutil"
            onClick={() => setParametros({}, { replace: true })}
          >
            Quitar el destacado
          </button>
        </Aviso>
      )}

      <Aviso>
        Las horas quedan registradas y calculadas desde que el estudiante las ingresa: no
        hay nada que aprobar. Intervienes cuando hay una solicitud de corrección.
      </Aviso>

      <Filtros
        resultados={visibles.length}
        total={estado.jornadas.length}
        campos={[
          { clave: 'desde', etiqueta: 'Desde', tipo: 'date', valor: desde, alCambiar: setDesde },
          { clave: 'hasta', etiqueta: 'Hasta', tipo: 'date', valor: hasta, alCambiar: setHasta },
          {
            clave: 'actividad',
            etiqueta: 'Actividad',
            valor: actividad,
            ejemplo: 'pruebas, soporte…',
            alCambiar: setActividad,
          },
          {
            clave: 'estado',
            etiqueta: 'Estado',
            valor: filtroEstado,
            alCambiar: setFiltroEstado,
            opciones: [
              { valor: TODOS, etiqueta: 'Todos' },
              { valor: ESTADO_FILA.SOLICITUD_PENDIENTE, etiqueta: 'Con solicitud pendiente' },
              { valor: ESTADO_JORNADA.REGISTRADA, etiqueta: ETIQUETAS.ESTADO_JORNADA.REGISTRADA },
              { valor: ESTADO_JORNADA.OBSERVADA, etiqueta: ETIQUETAS.ESTADO_JORNADA.OBSERVADA },
            ],
          },
        ]}
      />

      <TablaJornadas
        modo="docente"
        jornadas={visibles}
        grupo={grupo}
        ahora={ahora}
        idDestacado={jornadaDestacada}
        alVerEvidencia={(jornada) => setEvidencia(jornada.evidencia)}
        alRevisarSolicitud={(jornada) => setRevisando(jornada)}
        vacio={hayFiltros ? (
          <EstadoVacio
            titulo="Ninguna jornada coincide con esos filtros"
            accion={(
              <Boton
                variante="secundario"
                onClick={() => { setDesde(''); setHasta(''); setActividad(''); setFiltroEstado(TODOS); }}
              >
                Quitar los filtros
              </Boton>
            )}
          >
            Prueba con otro rango de fechas o quita el filtro de estado.
          </EstadoVacio>
        ) : (
          <EstadoVacio titulo="Este estudiante todavía no ha registrado jornadas">
            Cuando registre la primera, aparecerá aquí con sus horas calculadas.
          </EstadoVacio>
        )}
      />

      {/* RF-10: la evidencia se consulta desde el historial individual. */}
      {evidencia && (
        <Modal
          titulo="Evidencia de la jornada"
          apoyo={evidencia.nombre}
          alCerrar={() => setEvidencia(null)}
          pie={<Boton onClick={() => setEvidencia(null)}>Cerrar</Boton>}
        >
          <VistaPrevia archivo={evidencia} alto={400} />
        </Modal>
      )}

      {revisando && (
        <RevisarSolicitud
          jornada={revisando}
          estudianteNombre={estudiante.nombre}
          soloLectura={soloLectura}
          /*
           * Al elegir una decisión se CIERRA esta ventana y se abre la de resolución.
           * Dos modales apilados dejarían dos `aria-modal` activos a la vez y un lector
           * de pantalla podría seguir anunciando el de atrás. Cancelar la resolución
           * vuelve a abrir esta, así que no se pierde el contexto.
           */
          alHabilitar={() => {
            setErrorResolucion(null);
            setResolviendo({ jornada: revisando, accion: ESTADO_SOLICITUD.HABILITADA });
            setRevisando(null);
          }}
          alRechazar={() => {
            setErrorResolucion(null);
            setResolviendo({ jornada: revisando, accion: ESTADO_SOLICITUD.RECHAZADA });
            setRevisando(null);
          }}
          alCerrar={() => setRevisando(null)}
        />
      )}

      {resolviendo && (
        <ResolverSolicitud
          jornada={{ ...resolviendo.jornada, estudianteNombre: estudiante.nombre }}
          accion={resolviendo.accion}
          enCurso={aplicando}
          errorServicio={errorResolucion}
          alResolver={resolver}
          alCerrar={() => {
            // Volver a la revisión, no al historial: el docente estaba leyendo la jornada.
            setRevisando(resolviendo.jornada);
            setResolviendo(null);
          }}
        />
      )}
    </section>
  );
};

export default HistorialIndividualDocente;
