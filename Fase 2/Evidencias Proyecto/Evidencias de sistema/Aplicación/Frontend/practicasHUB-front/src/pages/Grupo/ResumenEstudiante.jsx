import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGrupo } from '../../context/useGrupo';
import { useAuth } from '../../context/useAuth';
import { useModoLectura } from '../../hooks/useModoLectura';
import { grupoService } from '../../services';
import { formatearHoras } from '../../utils/horas';
import { formatearFecha } from '../../utils/fechas';
import {
  Aviso, Boton, Cargando, EstadoError, Indicador, Indicadores,
} from '../../components/ui';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de resumen del grupo para el estudiante. Se usa en `LayoutGrupo` y se accede desde el menú lateral del grupo.

const ResumenEstudiante = () => {
  const { grupo } = useGrupo();
  const { usuario } = useAuth();
  const { soloLectura, propsBoton } = useModoLectura();
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });

  useEffect(() => {
    let vigente = true;

    grupoService.resumenEstudiante(grupo.id, usuario.id)
      .then((datos) => { if (vigente) setEstado({ datos, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            datos: null,
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudo cargar el resumen.',
          });
        }
      });

    return () => { vigente = false; };
  }, [grupo.id, usuario.id]);

  if (estado.cargando) return <Cargando mensaje="Cargando el resumen…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} />;

  const { datos } = estado;
  const base = baseDeGrupo(usuario.rol, grupo.id);

  return (
    <section className="ph-pila">
      <Indicadores>
        <Indicador
          etiqueta="Horas registradas"
          valor={formatearHoras(datos.registradas)}
          detalle={`de ${formatearHoras(datos.meta)} h de meta mínima`}
          avance={datos.porcentaje}
        />
        <Indicador
          etiqueta="Horas restantes"
          valor={formatearHoras(datos.restantes)}
          detalle={datos.metaAlcanzada
            ? 'meta alcanzada; las horas siguen sumando'
            : 'para alcanzar la meta mínima'}
        />
        <Indicador
          etiqueta="Jornadas registradas"
          valor={datos.totalJornadas}
          detalle={`desde el ${formatearFecha(grupo.creadoEn?.slice(0, 10))}`}
        />
        <Indicador
          etiqueta="Solicitudes pendientes"
          valor={datos.solicitudesPendientes}
          detalle={datos.solicitudesPendientes > 0
            ? 'esperando respuesta del docente'
            : 'sin solicitudes abiertas'}
        />
      </Indicadores>

      {/* RN-06 en palabras, para que nadie lea la barra al 100 % como un final. */}
      {datos.metaAlcanzada && (
        <Aviso tono="exito" titulo="Alcanzaste la meta mínima de horas">
          La meta no es un máximo: puedes seguir registrando jornadas y las horas se
          siguen acumulando.
        </Aviso>
      )}

      {datos.correccionesHabilitadas > 0 && !soloLectura && (
        <Aviso tono="espera" titulo="Tienes correcciones habilitadas">
          {`El docente habilitó ${datos.correccionesHabilitadas} ${datos.correccionesHabilitadas === 1 ? 'jornada' : 'jornadas'} para que la corrijas. Al guardar, vuelve a quedar registrada y bloqueada.`}
        </Aviso>
      )}

      {soloLectura && (
        <Aviso titulo="Esta práctica está inactiva">
          Conservas todo el historial y puedes consultarlo y descargarlo. Las acciones que
          modifican información aparecen bloqueadas.
        </Aviso>
      )}

      <div className="ph-tarjeta ph-pila">
        <div>
          <h2 className="ph-tarjeta__titulo">Qué puedes hacer aquí</h2>
          <p className="ph-tarjeta__apoyo">
            Todo lo que hagas queda dentro de esta práctica y no afecta a las demás.
          </p>
        </div>

        <div className="ph-fila" style={{ alignItems: 'flex-start' }}>
          <Link className="ph-boton" to={`${base}/jornadas`}>Ver mis jornadas</Link>
          {/* La acción de registrar vive en Jornadas (M-08); aquí solo se anticipa su estado. */}
          <Boton variante="secundario" {...propsBoton} onClick={() => {}}>
            Registrar jornada
          </Boton>
          <Link className="ph-boton ph-boton--secundario" to={`${base}/documentos`}>
            {datos.entregasPendientes > 0
              ? `Documentos (${datos.entregasPendientes} por entregar)`
              : 'Documentos'}
          </Link>
          <Link className="ph-boton ph-boton--tenue" to={`${base}/mi-practica`}>
            Datos de la práctica
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ResumenEstudiante;
