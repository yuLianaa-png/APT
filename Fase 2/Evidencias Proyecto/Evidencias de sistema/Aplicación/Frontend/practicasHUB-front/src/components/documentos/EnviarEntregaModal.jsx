import { useState } from 'react';
import { Aviso, Boton, Modal } from '../ui';
import { CampoArchivo, DescargarArchivo, VistaPrevia } from '../archivos';
import { documentoService } from '../../services';


//Enviar o reemplazar la entrega de un documento .

const EnviarEntregaModal = ({
  documento,
  entrega,
  esReemplazo = false,
  alEnviar,
  alCerrar,
  enCurso = false,
  errorServicio = null,
}) => {
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState(null);

  const plantilla = documentoService.versionVigente(documento);
  const actual = entrega?.versiones?.at(-1) ?? null;
  const siguiente = (entrega?.versiones?.length ?? 0) + 1;

  const confirmar = () => {
    if (!archivo) {
      setError('Selecciona el archivo que quieres entregar.');
      return;
    }
    setError(null);
    alEnviar(archivo);
  };

  return (
    <Modal
      titulo={esReemplazo ? 'Reemplazar tu entrega' : 'Entregar documento'}
      apoyo={documento.nombre}
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton onClick={confirmar} disabled={enCurso}>
            {enCurso
              ? 'Enviando…'
              : (esReemplazo ? `Enviar la versión ${siguiente}` : 'Confirmar entrega')}
          </Boton>
        </>
      )}
    >
      <div className="ph-pila">
        {errorServicio && (
          <Aviso tono="error" titulo="No se pudo enviar">{errorServicio}</Aviso>
        )}

        {/* §4.13: la instrucción de qué corregir. */}
        {esReemplazo && entrega.comentarioCorreccion && (
          <Aviso tono="espera" titulo="Lo que te pidió corregir el docente">
            {`«${entrega.comentarioCorreccion}»`}
          </Aviso>
        )}

        {/* §4.20: poder revisar la entrega actual antes de sustituirla. */}
        {esReemplazo && actual && (
          <div>
            <h3 className="ph-tarjeta__titulo">{`Lo que enviaste (v${actual.numero})`}</h3>
            <VistaPrevia archivo={actual.archivo} alto={240} />
          </div>
        )}

        {/* §4.12: el primer paso es descargar la plantilla. */}
        {!esReemplazo && plantilla && (
          <div className="ph-documento__archivo">
            <span className="ph-celda-principal">
              <strong>Plantilla a completar</strong>
              <span className="ph-campo__ayuda">{plantilla.archivo.nombre}</span>
            </span>
            <DescargarArchivo archivo={plantilla.archivo} etiqueta="Descargar plantilla" />
          </div>
        )}

        <CampoArchivo
          etiqueta={esReemplazo ? `Archivo de la versión ${siguiente}` : 'Tu archivo completado'}
          obligatorio
          valor={archivo}
          errorExterno={error}
          alCambiar={(nuevo) => { setArchivo(nuevo); setError(null); }}
        />

        {archivo && (
          <Aviso tono="espera" titulo="Revisa el nombre antes de confirmar">
            {`Vas a enviar «${archivo.name}». Tu docente lo verá con ese nombre.`}
          </Aviso>
        )}

        {esReemplazo && (
          <Aviso>
            {`La versión ${actual?.numero ?? 1} no se elimina: queda en tu historial. Después de enviar esta, no podrás volver a reemplazarla salvo que el docente lo pida otra vez.`}
          </Aviso>
        )}
      </div>
    </Modal>
  );
};

export default EnviarEntregaModal;
