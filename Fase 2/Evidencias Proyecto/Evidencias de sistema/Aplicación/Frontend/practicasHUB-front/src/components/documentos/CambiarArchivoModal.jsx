import { useState } from 'react';
import { Aviso, Boton, Modal } from '../ui';
import { CampoArchivo, VistaPrevia } from '../archivos';
import { documentoService } from '../../services';


const CambiarArchivoModal = ({ documento, alCambiar, alCerrar, enCurso = false, errorServicio = null }) => {
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState(null);

  const vigente = documentoService.versionVigente(documento);
  const siguiente = documento.versiones.length + 1;

  const confirmar = () => {
    if (!archivo) {
      setError('Selecciona el archivo nuevo.');
      return;
    }
    setError(null);
    alCambiar(archivo);
  };

  return (
    <Modal
      titulo="Cambiar el archivo publicado"
      apoyo={documento.nombre}
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton onClick={confirmar} disabled={enCurso}>
            {enCurso ? 'Publicando…' : `Publicar como versión ${siguiente}`}
          </Boton>
        </>
      )}
    >
      <div className="ph-pila">
        {errorServicio && (
          <Aviso tono="error" titulo="No se pudo cambiar">{errorServicio}</Aviso>
        )}

        <div>
          <h3 className="ph-tarjeta__titulo">{`Versión ${documento.versionVigente}, la actual`}</h3>
          {vigente && <VistaPrevia archivo={vigente.archivo} alto={240} />}
        </div>

        <CampoArchivo
          etiqueta={`Archivo de la versión ${siguiente}`}
          obligatorio
          valor={archivo}
          errorExterno={error}
          alCambiar={(nuevo) => { setArchivo(nuevo); setError(null); }}
        />

        {archivo && (
          <Aviso tono="espera" titulo="Revisa antes de publicar">
            {`Vas a publicar «${archivo.name}» como versión ${siguiente}. Todos los estudiantes del código recibirán un aviso.`}
          </Aviso>
        )}

        <Aviso>
          La versión {documento.versionVigente} <strong>no se elimina</strong>: quedará en
          el historial y seguirá descargable. Las entregas ya enviadas no se tocan y siguen
          asociadas a la versión que usaron.
        </Aviso>
      </div>
    </Modal>
  );
};

export default CambiarArchivoModal;
