import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGrupo } from '../../context/useGrupo';
import { useAuth } from '../../context/useAuth';
import { useModoLectura } from '../../hooks/useModoLectura';
import { grupoService } from '../../services';
import { formatearHoras } from '../../utils/horas';
import {
  Aviso, Boton, Cargando, EstadoError, Indicador, Indicadores,
} from '../../components/ui';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de resumen del grupo para el docente. Se usa en `LayoutGrupo` y se accede desde el menú lateral del grupo.

const ResumenDocente = () => {
  const { grupo } = useGrupo();
  const { usuario } = useAuth();
  const { soloLectura, propsBoton } = useModoLectura();
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });

  useEffect(() => {
    let vigente = true;

    grupoService.resumen(grupo.id)
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
  }, [grupo.id]);

  if (estado.cargando) return <Cargando mensaje="Cargando el resumen…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} />;

  const { datos } = estado;
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

      <div className="ph-tarjeta ph-pila">
        <div>
          <h2 className="ph-tarjeta__titulo">Qué puedes hacer aquí</h2>
          <p className="ph-tarjeta__apoyo">
            Todo queda dentro de este grupo. Los documentos se publican para todo el
            código; las jornadas y las entregas se revisan estudiante por estudiante.
          </p>
        </div>

        <div className="ph-fila" style={{ alignItems: 'flex-start' }}>
          <Link className="ph-boton" to={`${base}/estudiantes`}>Ver estudiantes</Link>
          <Link className="ph-boton ph-boton--secundario" to={`${base}/jornadas`}>
            {datos.solicitudesPendientes > 0
              ? `Jornadas (${datos.solicitudesPendientes} por revisar)`
              : 'Jornadas'}
          </Link>
          <Link className="ph-boton ph-boton--secundario" to={`${base}/documentos`}>
            Documentos
          </Link>
          {/* La publicación vive en Documentos (M-12); aquí se anticipa su estado. */}
          <Boton variante="tenue" {...propsBoton} onClick={() => {}}>
            Publicar documento
          </Boton>
        </div>
      </div>
    </section>
  );
};

export default ResumenDocente;
