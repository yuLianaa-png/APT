/**
 * Subida simulada de archivos.
 *
 * La validación NO vive aquí: es una regla del dominio y está en `utils/archivos.js`,
 * compartida por evidencias, documentos y entregas. Este módulo solo registra el
 * metadato y entrega un `ArchivoRef`.
 *
 * Limitación del mock, a tener presente al probar: el contenido real se referencia con
 * `URL.createObjectURL`, que vive en la pestaña y **no sobrevive a una recarga**. Tras
 * recargar, un archivo subido en la sesión anterior conserva su nombre, tipo y tamaño
 * pero ya no se puede abrir. Los de la semilla apuntan a muestras estáticas de `public/`,
 * que sí sobreviven. Con Supabase Storage (RNF-05) esto deja de ser un problema.
 */

import { validarArchivo } from '../../utils/archivos';
import { ERRORES } from '../../utils/constants';
import { nuevoId, transaccion } from './db';
import { fallar, responder } from './soporte';

const extensionDe = (nombre) => {
  const partes = String(nombre ?? '').toLowerCase().split('.');
  return partes.length > 1 ? partes.at(-1) : '';
};

/**
 * Registra el archivo y devuelve su `ArchivoRef`.
 * Vuelve a validar aunque el formulario ya lo haya hecho: el servicio es la frontera y
 * no confía en que quien lo llama haya comprobado nada.
 */
export const subir = (archivo) => {
  const resultado = validarArchivo(archivo);
  if (!resultado.ok) return fallar(ERRORES.ARCHIVO_INVALIDO, resultado.mensaje);

  let url = '';
  try {
    url = URL.createObjectURL(archivo);
  } catch {
    // En Node (tests) o si el objeto no es un Blob real: queda sin URL abrible.
    url = '';
  }

  const referencia = transaccion((datos) => {
    const nuevo = {
      id: nuevoId('arc'),
      nombre: archivo.name,
      extension: extensionDe(archivo.name),
      tipoMime: archivo.type || 'application/octet-stream',
      tamanoBytes: archivo.size ?? 0,
      url,
      // Marca que la URL es de esta pestaña y se pierde al recargar.
      efimera: Boolean(url),
    };
    datos.archivos.push(nuevo);
    return nuevo;
  });

  return responder(referencia);
};

/**
 * URL de descarga de un archivo ya registrado. En el mock es la que se guardó al subirlo;
 * con backend será una URL firmada que el servidor entrega tras comprobar la autorización
 * (RNF-03: la ruta del archivo nunca es el mecanismo de autorización).
 */
export const obtenerUrlDescarga = (archivoRef) => responder(archivoRef?.url ?? '');

export const archivoMock = { subir, obtenerUrlDescarga };
