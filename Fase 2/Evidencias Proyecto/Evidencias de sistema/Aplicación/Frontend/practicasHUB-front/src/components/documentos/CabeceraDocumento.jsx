import { Boton, InsigniaEstado } from '../ui';
import { documentoService } from '../../services';
import { formatearInstante } from '../../utils/fechas';
import { formatearTamano } from '../../utils/archivos';


const CabeceraDocumento = ({ documento, extra = null, acciones = null }) => {
  const vigente = documentoService.versionVigente(documento);

  return (
    <>
      <header className="ph-fila ph-fila--entre">
        <div>
          <h3 className="ph-tarjeta__titulo">{documento.nombre}</h3>
          <div className="ph-fila">
            <InsigniaEstado tipo="documento" estado={documento.tipo} />
            <span className="ph-campo__ayuda">
              {`Versión ${documento.versionVigente} · publicada el ${formatearInstante(vigente?.publicadaEn)}`}
            </span>
          </div>
        </div>
        {extra}
      </header>

      {documento.instrucciones && (
        <p className="ph-tarjeta__apoyo">{documento.instrucciones}</p>
      )}

      <div className="ph-documento__archivo">
        <span className="ph-celda-principal">
          <strong>{vigente?.archivo.nombre}</strong>
          <span className="ph-campo__ayuda">
            {formatearTamano(vigente?.archivo.tamanoBytes)}
          </span>
        </span>
        <div className="ph-fila">{acciones}</div>
      </div>
    </>
  );
};

/** Botón de historial, que las dos vistas ofrecen igual cuando hay más de una versión. */
export const BotonVersiones = ({ documento, alVer }) => {
  if (documento.versiones.length <= 1) return null;
  return (
    <Boton variante="tenue" tamano="pequeno" onClick={() => alVer(documento)}>
      {`Ver ${documento.versiones.length} versiones`}
    </Boton>
  );
};

export default CabeceraDocumento;
