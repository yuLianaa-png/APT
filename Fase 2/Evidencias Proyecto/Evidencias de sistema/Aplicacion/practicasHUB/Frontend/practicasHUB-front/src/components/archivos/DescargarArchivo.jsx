import { Boton } from '../ui';
import { formatearTamano } from '../../utils/archivos';


const DescargarArchivo = ({ archivo, etiqueta = 'Descargar', tamano = 'pequeno' }) => {
  if (!archivo) return null;

  // Un archivo subido en esta sesión usa una URL de objeto que no sobrevive a recargar.
  const sinUrl = !archivo.url;

  if (sinUrl) {
    return (
      <Boton
        variante="secundario"
        tamano={tamano}
        bloqueado
        motivoBloqueo="El contenido de este archivo no está disponible tras recargar la página. Es una limitación de los datos simulados."
      >
        {etiqueta}
      </Boton>
    );
  }

  return (
    <a
      className={`ph-boton ph-boton--secundario${tamano === 'pequeno' ? ' ph-boton--pequeno' : ''}`}
      href={archivo.url}
      download={archivo.nombre}
    >
      {etiqueta}
      <span className="ph-solo-lectores">
        {` ${archivo.nombre}, ${formatearTamano(archivo.tamanoBytes)}`}
      </span>
    </a>
  );
};

export default DescargarArchivo;
