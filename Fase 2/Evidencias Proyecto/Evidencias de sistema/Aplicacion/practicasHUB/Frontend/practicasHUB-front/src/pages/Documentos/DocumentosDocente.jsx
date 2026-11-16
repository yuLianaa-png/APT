import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { useModoLectura } from '../../hooks/useModoLectura';
import { archivoService, documentoService, entregaService } from '../../services';
import {
  Aviso, Boton, Cargando, EstadoError, EstadoVacio,
} from '../../components/ui';
import TarjetaDocumento from '../../components/documentos/TarjetaDocumento';
import CrearDocumentoModal from '../../components/documentos/CrearDocumentoModal';
import CambiarArchivoModal from '../../components/documentos/CambiarArchivoModal';
import HistorialVersionesDocumento from '../../components/documentos/HistorialVersionesDocumento';
import HistorialVersionesEntrega from '../../components/documentos/HistorialVersionesEntrega';
import DetalleEntregaDocente from '../../components/documentos/DetalleEntregaDocente';
import SolicitarCorreccionEntregaModal from '../../components/documentos/SolicitarCorreccionEntregaModal';

// Página de documentos del docente. Se usa en `LayoutGrupo` y se accede desde el menú lateral del grupo.

const DocumentosDocente = () => {
  const { usuario } = useAuth();
  const { grupo } = useGrupo();
  const { soloLectura, motivo } = useModoLectura();
  const [parametros] = useSearchParams();

  const [estado, setEstado] = useState({ tarjetas: [], cargando: true, error: null });
  const [creando, setCreando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);
  const [cambiando, setCambiando] = useState(null);
  const [versionesDe, setVersionesDe] = useState(null);
  const [entregaVista, setEntregaVista] = useState(null);
  const [pidiendoCorreccion, setPidiendoCorreccion] = useState(null);
  const [historialEntrega, setHistorialEntrega] = useState(null);
  const [aviso, setAviso] = useState(null);

  // Una notificación de documento llega con `?documento=<id>`.
  const documentoDestacado = parametros.get('documento');

  const cargar = useCallback(() => {
    let vigente = true;

    documentoService.listarConEntregas(grupo.id)
      .then((tarjetas) => { if (vigente) setEstado({ tarjetas, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            tarjetas: [],
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudieron cargar los documentos.',
          });
        }
      });

    return () => { vigente = false; };
  }, [grupo.id]);

  useEffect(() => cargar(), [cargar]);

  const publicar = async (datos) => {
    setEnviando(true);
    setErrorAccion(null);
    try {
      const archivo = await archivoService.subir(datos.archivo);
      const documento = await documentoService.crear({
        grupoId: grupo.id,
        nombre: datos.nombre,
        instrucciones: datos.instrucciones,
        tipo: datos.tipo,
        archivo,
      });
      setCreando(false);
      setAviso(`Se publicó «${documento.nombre}» y todos los estudiantes del código recibieron un aviso.`);
      cargar();
    } catch (fallo) {
      setErrorAccion(fallo?.mensaje ?? 'No se pudo publicar el documento.');
    } finally {
      setEnviando(false);
    }
  };

  const cambiarArchivo = async (nuevo) => {
    setEnviando(true);
    setErrorAccion(null);
    try {
      const archivo = await archivoService.subir(nuevo);
      const documento = await documentoService.cambiarArchivo(cambiando.id, archivo);
      setCambiando(null);
      setAviso(`«${documento.nombre}» pasó a la versión ${documento.versionVigente}. La anterior sigue en el historial.`);
      cargar();
    } catch (fallo) {
      setErrorAccion(fallo?.mensaje ?? 'No se pudo cambiar el archivo.');
    } finally {
      setEnviando(false);
    }
  };


  const solicitarCorreccion = async (comentario) => {
    const { entrega, documento } = pidiendoCorreccion;
    setEnviando(true);
    setErrorAccion(null);
    try {
      await entregaService.solicitarCorreccion(entrega.id, comentario, usuario.id);
      setAviso(`Le pediste a ${entrega.estudianteNombre} que corrija su entrega de «${documento.nombre}». Ya puede reemplazar su archivo.`);
      setPidiendoCorreccion(null);
      setEntregaVista(null);
      cargar();
    } catch (fallo) {
      setErrorAccion(fallo?.mensaje ?? 'No se pudo solicitar la corrección.');
    } finally {
      setEnviando(false);
    }
  };

  if (estado.cargando) return <Cargando mensaje="Cargando los documentos…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} alReintentar={cargar} />;

  return (
    <section className="ph-pila">
      <div className="ph-fila ph-fila--entre">
        <div>
          <h2>Documentos del grupo</h2>
          <p className="ph-tarjeta__apoyo">
            Lo que publicas aquí lo ven todos los estudiantes del código. Las entregas, en
            cambio, son de cada uno.
          </p>
        </div>
        <Boton
          bloqueado={soloLectura}
          motivoBloqueo={motivo}
          mostrarMotivo={false}
          onClick={() => { setErrorAccion(null); setCreando(true); }}
        >
          Crear documento
        </Boton>
      </div>

      {aviso && <Aviso tono="exito" titulo="Listo">{aviso}</Aviso>}

      {soloLectura && (
        <Aviso titulo="Este grupo está inactivo">
          Puedes previsualizar, descargar y consultar el historial de versiones. Publicar y
          cambiar archivos queda bloqueado hasta que lo reactives desde el Dashboard.
        </Aviso>
      )}

      {estado.tarjetas.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no has publicado documentos"
          accion={(
            <Boton bloqueado={soloLectura} motivoBloqueo={motivo} onClick={() => setCreando(true)}>
              Publicar el primero
            </Boton>
          )}
        >
          Puedes publicar documentos informativos o solicitudes que cada estudiante deba
          responder con una entrega.
        </EstadoVacio>
      ) : (
        <div className="ph-pila">
          {estado.tarjetas.map(({ documento, entregas }) => (
            <div
              key={documento.id}
              className={documento.id === documentoDestacado ? 'ph-destacado' : undefined}
            >
              <TarjetaDocumento
                documento={documento}
                entregas={entregas}
                soloLectura={soloLectura}
                motivoBloqueo={motivo}
                alCambiarArchivo={(elegido) => { setErrorAccion(null); setCambiando(elegido); }}
                alVerVersiones={setVersionesDe}
                alVerEntrega={(entrega) => setEntregaVista({ documento, entrega })}
              />
            </div>
          ))}
        </div>
      )}

      {creando && (
        <CrearDocumentoModal
          alCrear={publicar}
          alCerrar={() => setCreando(false)}
          creando={enviando}
          errorServicio={errorAccion}
        />
      )}

      {cambiando && (
        <CambiarArchivoModal
          documento={cambiando}
          alCambiar={cambiarArchivo}
          alCerrar={() => setCambiando(null)}
          enCurso={enviando}
          errorServicio={errorAccion}
        />
      )}

      {versionesDe && (
        <HistorialVersionesDocumento
          documento={versionesDe}
          alCerrar={() => setVersionesDe(null)}
        />
      )}

      {entregaVista && (
        <DetalleEntregaDocente
          entrega={entregaVista.entrega}
          nombreDocumento={entregaVista.documento.nombre}
          soloLectura={soloLectura}
          /*
           * Al abrir otra ventana desde aquí se CIERRA esta. Dos modales apilados dejarían
           * dos `aria-modal` activos y un lector de pantalla podría seguir anunciando el
           * de atrás; además, el botón «Cerrar» de los dos se confunde. Al cerrar la
           * segunda se vuelve a abrir esta, así que no se pierde el sitio.
           */
          alSolicitarCorreccion={() => {
            setErrorAccion(null);
            setPidiendoCorreccion(entregaVista);
            setEntregaVista(null);
          }}
          alVerHistorial={() => {
            setHistorialEntrega(entregaVista);
            setEntregaVista(null);
          }}
          alCerrar={() => setEntregaVista(null)}
        />
      )}

      {pidiendoCorreccion && (
        <SolicitarCorreccionEntregaModal
          entrega={pidiendoCorreccion.entrega}
          nombreDocumento={pidiendoCorreccion.documento.nombre}
          alSolicitar={solicitarCorreccion}
          alCerrar={() => {
            // Volver a la entrega, que es desde donde se pidió.
            setEntregaVista(pidiendoCorreccion);
            setPidiendoCorreccion(null);
          }}
          enCurso={enviando}
          errorServicio={errorAccion}
        />
      )}

      {historialEntrega && (
        <HistorialVersionesEntrega
          entrega={historialEntrega.entrega}
          nombreDocumento={historialEntrega.documento.nombre}
          esPropia={false}
          alCerrar={() => {
            setEntregaVista(historialEntrega);
            setHistorialEntrega(null);
          }}
        />
      )}
    </section>
  );
};

export default DocumentosDocente;
