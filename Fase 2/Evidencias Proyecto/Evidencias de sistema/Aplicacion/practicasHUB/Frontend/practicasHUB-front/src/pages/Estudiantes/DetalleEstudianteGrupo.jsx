import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { documentoService, grupoService } from '../../services';
import { ESTADO_ENTREGA, NIVEL_RIESGO, TIPO_DOCUMENTO } from '../../utils/constants';
import { formatearFecha, formatearInstante } from '../../utils/fechas';
import { formatearHoras } from '../../utils/horas';
import {
  Aviso, Boton, Cargando, EstadoError, EstadoVacio, Indicador, Indicadores, InsigniaEstado, Tabla,
} from '../../components/ui';
import { DescargarArchivo } from '../../components/archivos';
import { PanelSeguimiento } from '../../components/seguimiento';
import { TarjetaSupervisor } from '../../components/supervisor';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de detalle de un estudiante del grupo, vista por el docente. Se accede con «Ver estudiante» desde la sección Estudiantes.

const PESTANAS = {
  RESUMEN: 'RESUMEN',
  DOCUMENTOS: 'DOCUMENTOS',
};

const COLUMNAS_DOCUMENTOS = [
  { clave: 'documento', titulo: 'Documento' },
  { clave: 'tipo', titulo: 'Tipo' },
  { clave: 'estado', titulo: 'Entrega' },
  { clave: 'version', titulo: 'Versión', numerica: true },
  { clave: 'ultimoEnvio', titulo: 'Último envío' },
  { clave: 'archivo', titulo: 'Archivo', acciones: true },
];

const DetalleEstudianteGrupo = () => {
  const { vinculacionId } = useParams();
  const { usuario } = useAuth();
  const { grupo } = useGrupo();
  const [pestana, setPestana] = useState(PESTANAS.RESUMEN);
  const [estado, setEstado] = useState({
    estudiante: null, documentos: [], cargando: true, error: null,
  });

  const cargar = useCallback(() => {
    let vigente = true;

    Promise.all([
      grupoService.estudiantesDelGrupo(grupo.id),
      documentoService.listarConEntregas(grupo.id),
    ])
      .then(([padron, tarjetas]) => {
        const estudiante = padron.find((fila) => fila.vinculacionId === vinculacionId);
        if (!estudiante) {
          // RN-18: una vinculación que no pertenece a este grupo no se enseña vacía.
          throw Object.assign(new Error(), {
            mensaje: 'Ese estudiante no está vinculado a este grupo.',
          });
        }

        // De cada documento, solo la entrega de este estudiante.
        const documentos = tarjetas.map(({ documento, entregas }) => ({
          documento,
          entrega: entregas.find((entrega) => entrega.vinculacionId === vinculacionId) ?? null,
        }));

        if (vigente) setEstado({ estudiante, documentos, cargando: false, error: null });
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            estudiante: null,
            documentos: [],
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudo cargar el detalle del estudiante.',
          });
        }
      });

    return () => { vigente = false; };
  }, [grupo.id, vinculacionId]);

  useEffect(() => cargar(), [cargar]);

  if (estado.cargando) return <Cargando mensaje="Cargando el estudiante…" />;

  const base = baseDeGrupo(usuario.rol, grupo.id);

  if (estado.error || !estado.estudiante) {
    return (
      <section className="ph-pila">
        <EstadoError titulo="Estudiante no disponible" mensaje={estado.error ?? ''} />
        <div className="ph-fila">
          <Link className="ph-boton ph-boton--secundario" to={`${base}/estudiantes`}>
            Volver a estudiantes
          </Link>
        </div>
      </section>
    );
  }

  const { estudiante, documentos } = estado;

  // Solo cuentan los documentos que piden entrega; los informativos no se entregan.
  const entregas = documentos.map((fila) => fila.entrega).filter(Boolean);
  const entregadas = entregas.filter((e) => e.estado === ESTADO_ENTREGA.ENTREGADO).length;
  const pendientes = entregas.filter((e) => e.estado === ESTADO_ENTREGA.PENDIENTE).length;
  const enCorreccion = entregas
    .filter((e) => e.estado === ESTADO_ENTREGA.CORRECCION_SOLICITADA).length;

  return (
    <section className="ph-pila">
      <div className="ph-fila ph-fila--entre">
        <div>
          <h2>{estudiante.nombre}</h2>
          <p className="ph-tarjeta__apoyo">
            {`${estudiante.correo} · Vinculado el ${formatearFecha(estudiante.vinculadoEn?.slice(0, 10))}`}
          </p>
        </div>
        <Link className="ph-boton ph-boton--tenue" to={`${base}/estudiantes`}>
          ← Volver a estudiantes
        </Link>
      </div>

      {/* Alertas del estudiante: a qué conviene prestarle atención. */}
      {estudiante.riesgo && estudiante.riesgo.nivel !== NIVEL_RIESGO.SIN_ALERTA && (
        <Aviso
          tono={estudiante.riesgo.nivel === NIVEL_RIESGO.RIESGO ? 'error' : 'espera'}
          titulo={estudiante.riesgo.nivel === NIVEL_RIESGO.RIESGO ? 'Estudiante en riesgo' : 'Requiere atención'}
        >
          {estudiante.riesgo.motivos.join(' ')}
        </Aviso>
      )}

      {/* Jornadas lleva al historial individual, que ya tiene las acciones de revisión. */}
      <div className="ph-fila">
        <Boton
          variante={pestana === PESTANAS.RESUMEN ? 'primario' : 'secundario'}
          aria-pressed={pestana === PESTANAS.RESUMEN}
          onClick={() => setPestana(PESTANAS.RESUMEN)}
        >
          Resumen
        </Boton>
        <Link className="ph-boton ph-boton--secundario" to={`${base}/jornadas/${vinculacionId}`}>
          Jornadas
        </Link>
        <Boton
          variante={pestana === PESTANAS.DOCUMENTOS ? 'primario' : 'secundario'}
          aria-pressed={pestana === PESTANAS.DOCUMENTOS}
          onClick={() => setPestana(PESTANAS.DOCUMENTOS)}
        >
          Documentos
        </Boton>
      </div>

      {pestana === PESTANAS.RESUMEN && (
        <>
          <Indicadores>
            <Indicador
              etiqueta="Meta mínima"
              valor={`${formatearHoras(estudiante.meta)} h`}
              detalle="Definida para el grupo"
            />
            <Indicador
              etiqueta="Horas registradas"
              valor={`${formatearHoras(estudiante.registradas)} h`}
              detalle={estudiante.metaAlcanzada
                ? 'Meta alcanzada'
                : `${estudiante.porcentaje}% de la meta`}
              avance={estudiante.porcentaje}
            />
            <Indicador
              etiqueta="Jornadas"
              valor={estudiante.totalJornadas}
              detalle="Registros del estudiante"
            />
            <Indicador
              etiqueta="Entregas"
              valor={`${entregadas}/${entregas.length}`}
              detalle={pendientes > 0 ? `${pendientes} pendientes` : 'Sin entregas pendientes'}
            />
          </Indicadores>

          {/* Qué se hizo con la alerta: acciones, plan o prórroga y cierre. */}
          <PanelSeguimiento
            vinculacionId={vinculacionId}
            rutaMensajes={`${base}/mensajes?vinculacion=${vinculacionId}`}
            alCambiar={cargar}
          />

          <TarjetaSupervisor vinculacionId={vinculacionId} esDocente />

          <div className="ph-tarjeta ph-pila">
            <div>
              <h3>Seguimiento individual</h3>
              <p className="ph-tarjeta__apoyo">Resumen de la práctica del estudiante seleccionado.</p>
            </div>
            <p>
              Correcciones documentales pendientes de respuesta: <strong>{enCorreccion}</strong>.
            </p>
            <p>
              Correcciones de jornadas pendientes de respuesta: <strong>{estudiante.solicitudesPendientes}</strong>.
            </p>
            <p>
              Correcciones de jornadas habilitadas: <strong>{estudiante.correccionesHabilitadas}</strong>.
            </p>
            <p className="ph-tarjeta__apoyo">
              Puedes revisar las jornadas y los documentos de este estudiante desde los botones superiores.
            </p>
          </div>
        </>
      )}

      {pestana === PESTANAS.DOCUMENTOS && (
        <Tabla
          titulo={`Documentos de ${estudiante.nombre}`}
          ocultarTitulo
          columnas={COLUMNAS_DOCUMENTOS}
          filas={documentos}
          claveFila={(fila) => fila.documento.id}
          vacio={(
            <EstadoVacio titulo="Este grupo todavía no tiene documentos">
              Cuando publiques un documento en la sección Documentos, aparecerá aquí con la
              entrega de este estudiante.
            </EstadoVacio>
          )}
          celda={({ documento, entrega }, columna) => {
            const ultima = entrega?.versiones.at(-1) ?? null;

            switch (columna.clave) {
              case 'documento':
                return <strong>{documento.nombre}</strong>;
              case 'tipo':
                return <InsigniaEstado tipo="documento" estado={documento.tipo} />;
              case 'estado':
                return documento.tipo === TIPO_DOCUMENTO.INFORMATIVO
                  ? <span className="ph-campo__ayuda">No requiere entrega</span>
                  : <InsigniaEstado tipo="entrega" estado={entrega?.estado ?? ESTADO_ENTREGA.PENDIENTE} />;
              case 'version':
                return ultima ? ultima.numero : '—';
              case 'ultimoEnvio':
                return ultima ? formatearInstante(ultima.enviadaEn) : '—';
              case 'archivo':
                return ultima ? <DescargarArchivo archivo={ultima.archivo} /> : null;
              default:
                return null;
            }
          }}
        />
      )}
    </section>
  );
};

export default DetalleEstudianteGrupo;
