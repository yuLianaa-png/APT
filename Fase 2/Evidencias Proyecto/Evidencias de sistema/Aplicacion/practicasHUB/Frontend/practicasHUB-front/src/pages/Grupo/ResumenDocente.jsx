import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGrupo } from '../../context/useGrupo';
import { useAuth } from '../../context/useAuth';
import { useModoLectura } from '../../hooks/useModoLectura';
import { grupoService } from '../../services';
import { formatearHoras } from '../../utils/horas';
import { formatearFecha } from '../../utils/fechas';
import { NIVEL_RIESGO } from '../../utils/constants';
import {
  Aviso, Boton, Cargando, EstadoError, EstadoVacio, Indicador, Indicadores, InsigniaEstado,
} from '../../components/ui';
import FechaTerminoGrupo from '../../components/grupo/FechaTerminoGrupo';
import TablaEstudiantes from '../../components/estudiantes/TablaEstudiantes';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de resumen del grupo para el docente. Se usa en `LayoutGrupo` y se accede desde el menú lateral del grupo.

/** Columnas de «Seguimiento por estudiante». */
const COLUMNAS_SEGUIMIENTO = [
  { clave: 'nombre', titulo: 'Estudiante' },
  { clave: 'jornadas', titulo: 'Jornadas', numerica: true },
  { clave: 'horasRegistradas', titulo: 'Horas registradas', numerica: true },
  { clave: 'meta', titulo: 'Meta mínima', numerica: true },
  { clave: 'alertas', titulo: 'Estado' },
  { clave: 'accion', titulo: 'Acción', acciones: true },
];

/** Un acceso rápido: ícono, título y una línea de apoyo. */
const AccesoRapido = ({ a, signo, titulo, apoyo }) => (
  <Link className="ph-acceso-rapido" to={a}>
    <span className="ph-acceso-rapido__signo" aria-hidden="true">{signo}</span>
    <span className="ph-celda-principal">
      <strong>{titulo}</strong>
      <span className="ph-campo__ayuda">{apoyo}</span>
    </span>
  </Link>
);

const ResumenDocente = () => {
  const { grupo, recargar } = useGrupo();
  const { usuario } = useAuth();
  const { soloLectura, propsBoton } = useModoLectura();
  const [estado, setEstado] = useState({
    datos: null, padron: [], cargando: true, error: null,
  });

  const [editandoFecha, setEditandoFecha] = useState(false);
  const [guardandoFecha, setGuardandoFecha] = useState(false);
  const [errorFecha, setErrorFecha] = useState(null);

  const cargar = useCallback(() => {
    let vigente = true;

    Promise.all([grupoService.resumen(grupo.id), grupoService.estudiantesDelGrupo(grupo.id)])
      .then(([datos, padron]) => {
        if (vigente) setEstado({ datos, padron, cargando: false, error: null });
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            datos: null,
            padron: [],
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudo cargar el resumen.',
          });
        }
      });

    return () => { vigente = false; };
  }, [grupo.id]);

  useEffect(() => cargar(), [cargar]);

  const guardarFecha = async (fechaTermino) => {
    setGuardandoFecha(true);
    setErrorFecha(null);
    try {
      await grupoService.definirFechaTermino(grupo.id, fechaTermino);
      setEditandoFecha(false);
      // El grupo vive en el contexto: se recarga para que todo use la fecha nueva.
      recargar();
    } catch (fallo) {
      setErrorFecha(fallo?.mensaje ?? 'No se pudo guardar la fecha de término.');
    } finally {
      setGuardandoFecha(false);
    }
  };

  if (estado.cargando) return <Cargando mensaje="Cargando el resumen…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} alReintentar={cargar} />;

  const { datos, padron } = estado;
  const base = baseDeGrupo(usuario.rol, grupo.id);

  return (
    <section className="ph-pila">
      <Indicadores>
        <Indicador
          etiqueta="Meta mínima"
          valor={`${formatearHoras(datos.metaMinimaHoras)} h`}
          detalle="por estudiante; no es un máximo"
        />
        <Indicador
          etiqueta="Estudiantes vinculados"
          valor={datos.estudiantesVinculados}
          detalle={`con el código ${grupo.codigo}`}
        />
        <Indicador
          etiqueta="Solicitudes pendientes"
          valor={datos.solicitudesPendientes}
          detalle={datos.solicitudesPendientes > 0
            ? 'esperando tu respuesta'
            : 'sin solicitudes abiertas'}
        />
        <Indicador
          etiqueta="Entregas nuevas"
          valor={datos.entregasNuevas}
          detalle="enviadas y pendientes de revisión"
        />
      </Indicadores>

      {soloLectura && (
        <Aviso titulo="Este grupo está inactivo">
          Puedes consultar estudiantes, jornadas, documentos, entregas y versiones. No se
          habilitan correcciones ni se publican documentos. Para reactivarlo, vuelve al
          Dashboard general.
        </Aviso>
      )}

      {!soloLectura && datos.solicitudesPendientes > 0 && (
        <Aviso tono="espera" titulo="Hay solicitudes de corrección esperando">
          {`${datos.solicitudesPendientes} ${datos.solicitudesPendientes === 1 ? 'estudiante pidió' : 'estudiantes pidieron'} corregir una jornada. Mientras no respondas, esas jornadas siguen bloqueadas.`}
        </Aviso>
      )}

      {/* Alertas: a quién conviene mirar primero. No es una evaluación del estudiante. */}
      {datos.alertas?.length > 0 && (
        <div className="ph-tarjeta ph-pila">
          <div>
            <h2 className="ph-tarjeta__titulo">Estudiantes que requieren atención</h2>
            <p className="ph-tarjeta__apoyo">
              Según su actividad reciente, su ritmo frente a la meta y las solicitudes que
              esperan tu respuesta.
            </p>
          </div>
          <ul className="ph-alertas">
            {datos.alertas.map((fila) => (
              <li key={fila.vinculacionId} className="ph-alertas__fila">
                <div className="ph-alertas__cuerpo">
                  <strong>{fila.nombre}</strong>
                  <InsigniaEstado tipo="riesgo" estado={fila.riesgo.nivel} />
                  <span className="ph-campo__ayuda">{fila.riesgo.motivos.join(' ')}</span>
                </div>
                <Link
                  className="ph-boton ph-boton--secundario ph-boton--pequeno"
                  to={`${base}/estudiantes/${fila.vinculacionId}`}
                >
                  Ver estudiante
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {datos.estudiantesVinculados > 0 && datos.alertas?.length === 0 && (
        <Aviso tono="exito" titulo="Todos al día">
          Ningún estudiante tiene alertas de inactividad, de ritmo ni solicitudes atrasadas.
        </Aviso>
      )}

      <div className="ph-rejilla-dos">
        <div className="ph-tarjeta ph-pila">
          <h2 className="ph-tarjeta__titulo">Información del grupo</h2>

          <dl className="ph-ficha ph-ficha--panel">
            <div>
              <dt>Código</dt>
              <dd><code>{grupo.codigo}</code></dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd><InsigniaEstado tipo="grupo" estado={grupo.estado} /></dd>
            </div>
            <div>
              <dt>Año</dt>
              <dd>{grupo.anio ?? '—'}</dd>
            </div>
            <div>
              <dt>Meta mínima</dt>
              <dd>{`${formatearHoras(grupo.metaMinimaHoras)} h`}</dd>
            </div>
            <div className="ph-ficha__ancho">
              <dt>Fecha de término</dt>
              <dd className="ph-fila ph-fila--entre">
                <span>
                  {grupo.fechaTermino
                    ? formatearFecha(grupo.fechaTermino)
                    : 'Sin definir: se usa para las alertas de ritmo.'}
                </span>
                <Boton
                  variante="secundario"
                  tamano="pequeno"
                  {...propsBoton}
                  onClick={() => { setErrorFecha(null); setEditandoFecha(true); }}
                >
                  {grupo.fechaTermino ? 'Cambiar' : 'Definir'}
                </Boton>
              </dd>
            </div>
            <div className="ph-ficha__ancho">
              <dt>Descripción</dt>
              <dd>{grupo.descripcion}</dd>
            </div>
          </dl>
        </div>

        <div className="ph-tarjeta ph-pila">
          <h2 className="ph-tarjeta__titulo">Accesos rápidos</h2>

          <nav className="ph-pila" aria-label="Accesos rápidos del grupo">
            <AccesoRapido
              a={`${base}/estudiantes`}
              signo="◎"
              titulo="Estudiantes"
              apoyo={`${datos.estudiantesVinculados} ${datos.estudiantesVinculados === 1 ? 'persona vinculada' : 'personas vinculadas'} al grupo`}
            />
            <AccesoRapido
              a={`${base}/jornadas`}
              signo="◷"
              titulo="Jornadas"
              apoyo={datos.solicitudesPendientes > 0
                ? `${datos.solicitudesPendientes} ${datos.solicitudesPendientes === 1 ? 'solicitud' : 'solicitudes'} de corrección por revisar`
                : 'Registros de cada estudiante y solicitudes de corrección'}
            />
            <AccesoRapido
              a={`${base}/documentos`}
              signo="▣"
              titulo="Documentos"
              apoyo={datos.entregasNuevas > 0
                ? `${datos.entregasNuevas} ${datos.entregasNuevas === 1 ? 'entrega nueva' : 'entregas nuevas'} por revisar`
                : 'Publicaciones del grupo y entregas de los estudiantes'}
            />
          </nav>
        </div>
      </div>

      <div className="ph-tarjeta ph-pila">
        <div>
          <h2 className="ph-tarjeta__titulo">Seguimiento por estudiante</h2>
          <p className="ph-tarjeta__apoyo">Las horas de cada estudiante son independientes.</p>
        </div>

        <TablaEstudiantes
          titulo="Seguimiento por estudiante"
          estudiantes={padron}
          grupo={grupo}
          columnas={COLUMNAS_SEGUIMIENTO}
          celdaExtra={(fila, columna) => {
            if (columna.clave === 'horasRegistradas') return `${formatearHoras(fila.registradas)} h`;
            if (columna.clave === 'meta') return `${formatearHoras(grupo.metaMinimaHoras)} h`;
            if (columna.clave === 'alertas') {
              return <InsigniaEstado tipo="riesgo" estado={fila.riesgo?.nivel ?? NIVEL_RIESGO.SIN_ALERTA} />;
            }
            return null;
          }}
          accion={(fila) => (
            <Link
              className="ph-boton ph-boton--secundario ph-boton--pequeno"
              to={`${base}/estudiantes/${fila.vinculacionId}`}
            >
              Ver estudiante
            </Link>
          )}
          vacio={(
            <EstadoVacio titulo="Todavía no hay estudiantes vinculados">
              {`Comparte el código ${grupo.codigo} para que se vinculen a esta práctica.`}
            </EstadoVacio>
          )}
        />
      </div>

      {editandoFecha && (
        <FechaTerminoGrupo
          grupo={grupo}
          guardando={guardandoFecha}
          errorServicio={errorFecha}
          alGuardar={guardarFecha}
          alCerrar={() => setEditandoFecha(false)}
        />
      )}
    </section>
  );
};

export default ResumenDocente;
