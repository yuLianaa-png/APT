import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { useModoLectura } from '../../hooks/useModoLectura';
import { useAhora } from '../../hooks/useAhora';
import { jornadaService, solicitudService } from '../../services';
import { ESTADO_JORNADA, ETIQUETAS } from '../../utils/constants';
import { ESTADO_FILA, TODOS, filtrarJornadas } from '../../utils/filtros';
import { puedeEditarDirecto } from '../../utils/plazo';
import {
  Aviso, Boton, Cargando, EstadoError, EstadoVacio, Filtros,
} from '../../components/ui';
import IndicadoresJornadas from '../../components/jornadas/IndicadoresJornadas';
import TablaJornadas from '../../components/jornadas/TablaJornadas';
import SolicitarCorreccion from '../../components/jornadas/SolicitarCorreccion';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de jornadas del grupo, vista por el estudiante. Se usa en `LayoutGrupo` y se accede desde el menú lateral del grupo.

const JornadasEstudiante = () => {
  const { usuario } = useAuth();
  const { grupo } = useGrupo();
  const { soloLectura, propsBoton } = useModoLectura();
  const navegar = useNavigate();

  const [estado, setEstado] = useState({
    jornadas: [], indicadores: null, cargando: true, error: null,
  });
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [actividad, setActividad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(TODOS);
  const [solicitando, setSolicitando] = useState(null);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [errorSolicitud, setErrorSolicitud] = useState(null);
  const [aviso, setAviso] = useState(null);

  // El reloj va en estado y se refresca solo: leerlo durante el render lo memoriza el
  // React Compiler y el plazo se queda congelado. Ver `useAhora`.
  const [ahora] = useAhora();
  /*
   * RN-16: la acción `Ver` de una notificación no solo carga el grupo, **abre el
   * elemento**. Llega como `?jornada=<id>` y la fila se destaca, para no tener que
   * buscarla a mano entre veinte.
   */
  const [parametros, setParametros] = useSearchParams();
  const jornadaDestacada = parametros.get('jornada');

  const cargar = useCallback(() => {
    let vigente = true;

    Promise.all([
      jornadaService.listarDeEstudianteEnGrupo(usuario.id, grupo.id),
      jornadaService.indicadores(usuario.id, grupo.id),
    ])
      .then(([jornadas, indicadores]) => {
        if (vigente) setEstado({ jornadas, indicadores, cargando: false, error: null });
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            jornadas: [],
            indicadores: null,
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudieron cargar tus jornadas.',
          });
        }
      });

    return () => { vigente = false; };
  }, [usuario.id, grupo.id]);

  useEffect(() => cargar(), [cargar]);

  const visibles = useMemo(
    () => filtrarJornadas(
      estado.jornadas,
      { desde, hasta, actividad, estado: filtroEstado },
      (jornada) => puedeEditarDirecto(jornada, grupo, ahora),
    ),
    [estado.jornadas, desde, hasta, actividad, filtroEstado, grupo, ahora],
  );

  const hayFiltros = desde !== '' || hasta !== '' || actividad.trim() !== '' || filtroEstado !== TODOS;
  const limpiarFiltros = () => {
    setDesde(''); setHasta(''); setActividad(''); setFiltroEstado(TODOS);
  };

  /** §4.9: enviar la solicitud. La jornada sigue Registrada y bloqueada (RN-12). */
  const enviarSolicitud = async (motivo) => {
    setEnviandoSolicitud(true);
    setErrorSolicitud(null);
    try {
      await solicitudService.crear(solicitando.id, motivo);
      setSolicitando(null);
      setAviso('Solicitud enviada. El docente la revisará; mientras tanto, la jornada sigue registrada y bloqueada.');
      cargar();
    } catch (fallo) {
      setErrorSolicitud(fallo?.mensaje ?? 'No se pudo enviar la solicitud.');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  if (estado.cargando) return <Cargando mensaje="Cargando tus jornadas…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} alReintentar={cargar} />;

  const base = baseDeGrupo(usuario.rol, grupo.id);

  return (
    <section className="ph-pila">
      <IndicadoresJornadas datos={estado.indicadores} />

      <div className="ph-fila ph-fila--entre">
        <div>
          <h2>Historial de jornadas</h2>
          <p className="ph-tarjeta__apoyo">
            Puedes corregir una jornada tú mismo durante 24 horas desde que la registras.
            Después necesitas que el docente lo autorice.
          </p>
        </div>
        <Boton {...propsBoton} onClick={() => navegar(`${base}/jornadas/nueva`)}>
          Registrar jornada
        </Boton>
      </div>

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

      {soloLectura && (
        <Aviso titulo="Esta práctica está inactiva">
          Puedes consultar y descargar todo tu historial. Registrar, editar y solicitar
          correcciones queda bloqueado.
        </Aviso>
      )}

      {estado.indicadores.correccionesHabilitadas > 0 && !soloLectura && (
        <Aviso tono="espera" titulo="Tienes correcciones habilitadas">
          Usa <strong>Modificar jornada</strong> en las filas marcadas como Observadas. Al
          guardar, la jornada vuelve a quedar registrada y bloqueada.
        </Aviso>
      )}

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
              { valor: ESTADO_FILA.EDITABLE, etiqueta: 'Aún editables (24 h)' },
              { valor: ESTADO_JORNADA.REGISTRADA, etiqueta: ETIQUETAS.ESTADO_JORNADA.REGISTRADA },
              { valor: ESTADO_JORNADA.OBSERVADA, etiqueta: ETIQUETAS.ESTADO_JORNADA.OBSERVADA },
              { valor: ESTADO_FILA.SOLICITUD_PENDIENTE, etiqueta: 'Con solicitud pendiente' },
            ],
          },
        ]}
      />

      <TablaJornadas
        jornadas={visibles}
        grupo={grupo}
        ahora={ahora}
        idDestacado={jornadaDestacada}
        alEditar={(jornada) => navegar(`${base}/jornadas/${jornada.id}/editar`)}
        alSolicitar={(jornada) => { setErrorSolicitud(null); setSolicitando(jornada); }}
        alModificar={(jornada) => navegar(`${base}/jornadas/${jornada.id}/modificar`)}
        vacio={hayFiltros ? (
          <EstadoVacio
            titulo="Ninguna jornada coincide con esos filtros"
            accion={<Boton variante="secundario" onClick={limpiarFiltros}>Quitar los filtros</Boton>}
          >
            Prueba con otro rango de fechas o quita el filtro de estado.
          </EstadoVacio>
        ) : (
          <EstadoVacio
            titulo="Todavía no has registrado jornadas"
            accion={(
              <Boton {...propsBoton} onClick={() => navegar(`${base}/jornadas/nueva`)}>
                Registrar mi primera jornada
              </Boton>
            )}
          >
            Cada jornada guarda la fecha, el horario, el descanso y lo que hiciste. Las
            horas las calcula el sistema.
          </EstadoVacio>
        )}
      />

      {solicitando && (
        <SolicitarCorreccion
          jornada={solicitando}
          enCurso={enviandoSolicitud}
          errorServicio={errorSolicitud}
          alEnviar={enviarSolicitud}
          alCerrar={() => setSolicitando(null)}
        />
      )}
    </section>
  );
};

export default JornadasEstudiante;
