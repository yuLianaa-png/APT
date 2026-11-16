import { Aviso, Boton, InsigniaEstado } from '../ui';
import { DescargarArchivo } from '../archivos';
import CabeceraDocumento, { BotonVersiones } from './CabeceraDocumento';
import { documentoService } from '../../services';
import { ESTADO_ENTREGA, TIPO_DOCUMENTO } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';

// Tarjeta de un documento, con su archivo vigente y, si requiere entrega, la información de la entrega del estudiante.

const TarjetaDocumentoEstudiante = ({
  documento,
  entrega,
  soloLectura,
  motivoBloqueo,
  alEntregar,
  alReemplazar,
  alVerVersiones,
  alVerMiEntrega,
  alVerMiHistorial,
}) => {
  const vigente = documentoService.versionVigente(documento);
  const requiereEntrega = documento.tipo === TIPO_DOCUMENTO.REQUIERE_ENTREGA;
  const ultima = entrega?.versiones?.at(-1) ?? null;

  return (
    <article className="ph-tarjeta ph-pila">
      <CabeceraDocumento
        documento={documento}
        extra={requiereEntrega && entrega && (
          <InsigniaEstado tipo="entrega" estado={entrega.estado} prefijo="Mi entrega" />
        )}
        acciones={(
          <>
            {/* descargar sigue disponible con el grupo inactivo. */}
            <DescargarArchivo
              archivo={vigente?.archivo}
              etiqueta={requiereEntrega ? 'Descargar plantilla' : 'Descargar'}
            />
            <BotonVersiones documento={documento} alVer={alVerVersiones} />
          </>
        )}
      />

      {requiereEntrega && entrega && (
        <div className="ph-entrega-propia">
          {entrega.estado === ESTADO_ENTREGA.CORRECCION_SOLICITADA && (
            <Aviso tono="espera" titulo="El docente te pidió corregir esta entrega">
              {`«${entrega.comentarioCorreccion}»`}
            </Aviso>
          )}

          {ultima && (
            <div className="ph-documento__archivo">
              <span className="ph-celda-principal">
                <strong>{`Tu entrega · v${ultima.numero}`}</strong>
                <span className="ph-campo__ayuda">
                  {`${ultima.archivo.nombre} · enviada el ${formatearInstante(ultima.enviadaEn)}`}
                </span>
              </span>

              <div className="ph-fila">
                <Boton
                  variante="secundario"
                  tamano="pequeno"
                  onClick={() => alVerMiEntrega(documento, entrega)}
                >
                  Ver mi entrega
                </Boton>
                {entrega.versiones.length > 1 && (
                  <Boton
                    variante="tenue"
                    tamano="pequeno"
                    onClick={() => alVerMiHistorial(documento, entrega)}
                  >
                    {`Ver mis ${entrega.versiones.length} versiones`}
                  </Boton>
                )}
              </div>
            </div>
          )}

          <div className="ph-fila" style={{ alignItems: 'flex-start' }}>
            {entrega.estado === ESTADO_ENTREGA.PENDIENTE && (
              <Boton
                bloqueado={soloLectura}
                motivoBloqueo={motivoBloqueo}
                onClick={() => alEntregar(documento, entrega)}
              >
                Entregar
              </Boton>
            )}

            {entrega.estado === ESTADO_ENTREGA.CORRECCION_SOLICITADA && (
              <Boton
                bloqueado={soloLectura}
                motivoBloqueo={motivoBloqueo}
                onClick={() => alReemplazar(documento, entrega)}
              >
                Reemplazar archivo
              </Boton>
            )}

            {entrega.estado === ESTADO_ENTREGA.ENTREGADO && (
              <p className="ph-campo__ayuda">
                Entrega enviada. Si el docente te pide corregirla, aquí aparecerá el botón
                para reemplazarla.
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default TarjetaDocumentoEstudiante;
