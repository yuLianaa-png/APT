import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { useModoLectura } from '../../hooks/useModoLectura';
import { archivoService, documentoService, entregaService } from '../../services';
import { ESTADO_ENTREGA } from '../../utils/constants';
import {
  Aviso, Boton, Cargando, EstadoError, EstadoVacio, Indicador, Indicadores, Modal,
} from '../../components/ui';
import { VistaPrevia } from '../../components/archivos';
import TarjetaDocumentoEstudiante from '../../components/documentos/TarjetaDocumentoEstudiante';
import EnviarEntregaModal from '../../components/documentos/EnviarEntregaModal';
import HistorialVersionesDocumento from '../../components/documentos/HistorialVersionesDocumento';
import HistorialVersionesEntrega from '../../components/documentos/HistorialVersionesEntrega';

// Página de documentos del estudiante. Se usa en `LayoutGrupo` y se accede desde el menú lateral del grupo.

const DocumentosEstudiante = () => {
  const { usuario } = useAuth();
  const { grupo } = useGrupo();
  const { soloLectura, motivo } = useModoLectura();
  const [parametros] = useSearchParams();

  const [estado, setEstado] = useState({
    tarjetas: [], indicadores: null, cargando: true, error: null,
  });
  const [enviando, setEnviando] = useState(null);
  const [enCurso, setEnCurso] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);
  const [versionesDe, setVersionesDe] = useState(null);
  const [miHistorial, setMiHistorial] = useState(null);
  const [miEntrega, setMiEntrega] = useState(null);
  const [aviso, setAviso] = useState(null);

  // RN-16: una notificación de documento o entrega llega con su id en la consulta.
  const destacado = parametros.get('documento');
  const entregaDestacada = parametros.get('entrega');

  const cargar = useCallback(() => {
    let vigente = true;

    Promise.all([
      documentoService.listarParaEstudiante(grupo.id, usuario.id),
      entregaService.indicadores(usuario.id, grupo.id),
    ])
      .then(([tarjetas, indicadores]) => {
        if (vigente) setEstado({ tarjetas, indicadores, cargando: false, error: null });
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            tarjetas: [],
            indicadores: null,
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudieron cargar los documentos.',
          });
        }
      });

    return () => { vigente = false; };
  }, [grupo.id, usuario.id]);

  useEffect(() => cargar(), [cargar]);

  const enviar = async (archivo) => {
    setEnCurso(true);
    setErrorAccion(null);
    try {
      const referencia = await archivoService.subir(archivo);
      await entregaService.enviar(enviando.entrega.id, referencia, usuario.id);
      setAviso(enviando.esReemplazo
        ? `Enviaste una versión nueva de «${enviando.documento.nombre}». La anterior queda en tu historial.`
        : `Entregaste «${enviando.documento.nombre}».`);
      setEnviando(null);
      cargar();
    } catch (fallo) {
      setErrorAccion(fallo?.mensaje ?? 'No se pudo enviar la entrega.');
    } finally {
      setEnCurso(false);
    }
  };

  if (estado.cargando) return <Cargando mensaje="Cargando los documentos…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} alReintentar={cargar} />;

  const { indicadores } = estado;

  return (
    <section className="ph-pila">
      <Indicadores>
        <Indicador
          etiqueta="Documentos del grupo"
          valor={indicadores.documentosDelGrupo}
          detalle="publicados por tu docente"
        />
        <Indicador
          etiqueta="Pendientes de entrega"
          valor={indicadores.entregasPendientes}
          detalle={indicadores.entregasPendientes > 0 ? 'te falta enviarlos' : 'nada pendiente'}
        />
        <Indicador
          etiqueta="Entregados"
          valor={indicadores.entregasRealizadas}
          detalle="enviados y en revisión"
        />
        <Indicador
          etiqueta="Con corrección pedida"
          valor={indicadores.correccionesSolicitadas}
          detalle={indicadores.correccionesSolicitadas > 0
            ? 'puedes reemplazarlos'
            : 'ninguno por corregir'}
        />
      </Indicadores>

      <div>
        <h2>Documentos de la práctica</h2>
        <p className="ph-tarjeta__apoyo">
          Los documentos son del grupo; tus entregas son solo tuyas. Nadie más ve lo que
          envías.
        </p>
      </div>

      {aviso && <Aviso tono="exito" titulo="Listo">{aviso}</Aviso>}
      {errorAccion && !enviando && (
        <Aviso tono="error" titulo="No se pudo enviar">{errorAccion}</Aviso>
      )}

      {soloLectura && (
        <Aviso titulo="Esta práctica está inactiva">
          Puedes previsualizar y descargar los documentos y tus entregas anteriores.
          Entregar y reemplazar quedan bloqueados.
        </Aviso>
      )}

      {indicadores.correccionesSolicitadas > 0 && !soloLectura && (
        <Aviso tono="espera" titulo="Tienes entregas por corregir">
          Busca las tarjetas marcadas como «Corrección solicitada»: el comentario del
          docente está en cada una.
        </Aviso>
      )}

      {estado.tarjetas.length === 0 ? (
        <EstadoVacio titulo="Tu docente todavía no ha publicado documentos">
          Cuando publique un reglamento, una pauta o una solicitud de entrega, aparecerá
          aquí y recibirás un aviso.
        </EstadoVacio>
      ) : (
        <div className="ph-pila">
          {estado.tarjetas.map(({ documento, entrega }) => (
            <div
              key={documento.id}
              className={documento.id === destacado || (entrega?.id && entrega.id === entregaDestacada)
                ? 'ph-destacado'
                : undefined}
            >
              <TarjetaDocumentoEstudiante
                documento={documento}
                entrega={entrega}
                soloLectura={soloLectura}
                motivoBloqueo={motivo}
                alEntregar={(doc, ent) => {
                  setErrorAccion(null);
                  setEnviando({ documento: doc, entrega: ent, esReemplazo: false });
                }}
                alReemplazar={(doc, ent) => {
                  setErrorAccion(null);
                  setEnviando({ documento: doc, entrega: ent, esReemplazo: true });
                }}
                alVerVersiones={setVersionesDe}
                alVerMiEntrega={(doc, ent) => setMiEntrega({ documento: doc, entrega: ent })}
                alVerMiHistorial={(doc, ent) => setMiHistorial({ documento: doc, entrega: ent })}
              />
            </div>
          ))}
        </div>
      )}

      {enviando && (
        <EnviarEntregaModal
          documento={enviando.documento}
          entrega={enviando.entrega}
          esReemplazo={enviando.esReemplazo}
          alEnviar={enviar}
          alCerrar={() => setEnviando(null)}
          enCurso={enCurso}
          errorServicio={errorAccion}
        />
      )}

      {versionesDe && (
        <HistorialVersionesDocumento
          documento={versionesDe}
          alCerrar={() => setVersionesDe(null)}
        />
      )}

      {miHistorial && (
        <HistorialVersionesEntrega
          entrega={miHistorial.entrega}
          nombreDocumento={miHistorial.documento.nombre}
          alCerrar={() => setMiHistorial(null)}
        />
      )}

      {miEntrega && (
        <Modal
          titulo="Tu entrega"
          apoyo={miEntrega.documento.nombre}
          alCerrar={() => setMiEntrega(null)}
          pie={<Boton onClick={() => setMiEntrega(null)}>Cerrar</Boton>}
        >
          <div className="ph-pila">
            <VistaPrevia archivo={miEntrega.entrega.versiones.at(-1)?.archivo} alto={340} />
            {miEntrega.entrega.estado === ESTADO_ENTREGA.ENTREGADO && (
              <Aviso>
                Esta es la versión que tiene tu docente. No se puede cambiar salvo que él
                pida una corrección.
              </Aviso>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
};

export default DocumentosEstudiante;
