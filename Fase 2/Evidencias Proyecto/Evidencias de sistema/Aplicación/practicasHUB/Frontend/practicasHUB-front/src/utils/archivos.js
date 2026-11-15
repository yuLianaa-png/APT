/**
 * Validación de archivos (RNF-08, §7.1 y §5.20 del manual).
 *
 * Máximo 40 MB. Se admiten PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, JPEG y PNG.
 * Se rechazan videos, ejecutables y cualquier cosa que no sea documento o imagen.
 *
 * Es una regla del dominio, no del transporte: por eso vive aquí y no en la capa de
 * servicios. Evidencias de jornada, documentos docentes y entregas la comparten; antes
 * estaba duplicada y mal en dos formularios, con 2 MB y solo tres formatos (B-10, B-11).
 *
 * Qué comprueba, y por qué cada cosa:
 *  - **Nombre**: no vacío, sin separadores de ruta ni `..`, sin caracteres de control y
 *    de largo razonable. Un nombre no es un mecanismo de autorización (§7.1 de V1.2),
 *    pero sí puede ser un vector si se usa tal cual para construir una ruta.
 *  - **Extensión**: lista blanca. Lo que no está, no entra.
 *  - **Doble extensión**: `informe.pdf.exe` y `informe.exe.pdf` se rechazan los dos. El
 *    primero porque termina en ejecutable; el segundo porque esconde uno en medio.
 *  - **Tipo declarado**: si el navegador informa un `type`, debe corresponder a la
 *    extensión. Un `.mp4` renombrado a `.pdf` llega con `video/mp4` y se cae aquí.
 *  - **Tamaño**: 40 MB exactos como límite superior inclusive.
 *
 * Esto es validación de CLIENTE: sirve para avisar antes de subir. **El backend debe
 * validar otra vez por su cuenta** (§8 del manual). Un cliente nunca es la autoridad, y
 * el `type` que informa el navegador lo decide el sistema operativo por la extensión, así
 * que un archivo renombrado con cuidado puede pasar este filtro.
 */

import { LIMITES_ARCHIVO } from './constants';

/** Por qué se rechazó. Permite dar un mensaje distinto según la causa (§5.20). */
export const CAUSA_RECHAZO = {
  VACIO: 'VACIO',
  NOMBRE: 'NOMBRE',
  FORMATO: 'FORMATO',
  VIDEO: 'VIDEO',
  EJECUTABLE: 'EJECUTABLE',
  TAMANO: 'TAMANO',
};

/** Qué tipos MIME admite cada extensión permitida. */
const MIME_POR_EXTENSION = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
};

/** Extensiones de ejecutable y de script. Nunca se aceptan, ni escondidas en medio. */
const EXTENSIONES_EJECUTABLES = new Set([
  'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'cpl', 'dll', 'sys',
  'ps1', 'psm1', 'vbs', 'vbe', 'wsf', 'hta', 'reg',
  'sh', 'bash', 'zsh', 'run', 'bin', 'app', 'dmg', 'pkg',
  'jar', 'apk', 'deb', 'rpm', 'appimage',
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'py', 'rb', 'pl', 'php',
]);

const EXTENSIONES_VIDEO = new Set([
  'mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv', 'm4v', 'mpg', 'mpeg',
  '3gp', '3g2', 'ogv', 'ts', 'vob', 'rm', 'rmvb', 'asf', 'divx',
]);

const MAXIMO_LARGO_NOMBRE = 180;

/** Segmentos de un nombre, en minúsculas: 'Informe.PDF.exe' -> ['informe','pdf','exe']. */
const segmentos = (nombre) => String(nombre).toLowerCase().split('.');

/** Última extensión del nombre. '' si no tiene punto. */
export const extensionDe = (nombre) => {
  const partes = segmentos(nombre ?? '');
  return partes.length > 1 ? partes.at(-1) : '';
};

const rechazo = (causa, mensaje) => ({ ok: false, causa, mensaje });
const aceptado = { ok: true, causa: null, mensaje: null };

/** Tamaño legible: 41943040 -> '40,0 MB'. */
export const formatearTamano = (bytes) => {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${Math.round(valor / 1024)} KB`;
  return `${(valor / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
};

const nombreAceptable = (nombre) => {
  const texto = String(nombre ?? '');
  if (texto.trim().length === 0) return false;
  if (texto.length > MAXIMO_LARGO_NOMBRE) return false;
  if (/[\\/]/.test(texto)) return false;
  if (texto.includes('..')) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(texto)) return false;
  return true;
};

/**
 * Comprueba un `File` del navegador, o cualquier objeto con `name`, `type` y `size`.
 *
 * @returns {{ ok: boolean, causa: string|null, mensaje: string|null }}
 */
export const validarArchivo = (archivo) => {
  if (!archivo) {
    return rechazo(CAUSA_RECHAZO.VACIO, 'Selecciona un archivo.');
  }

  if (!nombreAceptable(archivo.name)) {
    return rechazo(
      CAUSA_RECHAZO.NOMBRE,
      'El nombre del archivo no es válido. Evita barras, puntos dobles y nombres muy largos.',
    );
  }

  const partes = segmentos(archivo.name);
  const extension = partes.length > 1 ? partes.at(-1) : '';
  const tipo = String(archivo.type ?? '').toLowerCase();

  // El tipo declarado manda sobre la extensión: un .mp4 renombrado a .pdf se delata aquí.
  if (tipo.startsWith('video/')) {
    return rechazo(
      CAUSA_RECHAZO.VIDEO,
      'No se admiten videos. PrácticasHub solo acepta documentos e imágenes.',
    );
  }

  // Cualquier segmento ejecutable, esté al final o escondido en medio.
  const segmentoEjecutable = partes.slice(1).find((parte) => EXTENSIONES_EJECUTABLES.has(parte));
  if (segmentoEjecutable) {
    return rechazo(
      CAUSA_RECHAZO.EJECUTABLE,
      `No se admiten archivos ejecutables ni scripts, y este contiene «.${segmentoEjecutable}».`,
    );
  }

  const segmentoVideo = partes.slice(1).find((parte) => EXTENSIONES_VIDEO.has(parte));
  if (segmentoVideo) {
    return rechazo(
      CAUSA_RECHAZO.VIDEO,
      'No se admiten videos. PrácticasHub solo acepta documentos e imágenes.',
    );
  }

  if (!LIMITES_ARCHIVO.EXTENSIONES.includes(extension)) {
    return rechazo(
      CAUSA_RECHAZO.FORMATO,
      extension
        ? `No se admite «.${extension}». Formatos permitidos: ${LIMITES_ARCHIVO.EXTENSIONES.join(', ')}.`
        : `El archivo no tiene extensión. Formatos permitidos: ${LIMITES_ARCHIVO.EXTENSIONES.join(', ')}.`,
    );
  }

  // Si el navegador informó un tipo, tiene que corresponder a la extensión.
  if (tipo && !(MIME_POR_EXTENSION[extension] ?? []).includes(tipo)) {
    return rechazo(
      CAUSA_RECHAZO.FORMATO,
      `El contenido del archivo no corresponde a un «.${extension}».`,
    );
  }

  const tamano = Number(archivo.size);
  if (Number.isFinite(tamano) && tamano > LIMITES_ARCHIVO.TAMANO_MAXIMO_BYTES) {
    return rechazo(
      CAUSA_RECHAZO.TAMANO,
      `El archivo pesa ${formatearTamano(tamano)} y el máximo es 40 MB.`,
    );
  }

  return aceptado;
};

/**
 * Decisión A-07: el navegador solo previsualiza PDF, imágenes y texto plano. Los formatos
 * de Office necesitarían un conversor o un visor externo, que el MVP no tiene, así que se
 * muestran como ficha con botón de descarga.
 */
export const esPrevisualizable = (archivoRef) =>
  LIMITES_ARCHIVO.EXTENSIONES_PREVISUALIZABLES.includes(
    String(archivoRef?.extension ?? extensionDe(archivoRef?.nombre)).toLowerCase(),
  );

/** Cómo se previsualiza: determina qué dibuja `VistaPrevia`. */
export const modoVistaPrevia = (archivoRef) => {
  const extension = String(archivoRef?.extension ?? extensionDe(archivoRef?.nombre)).toLowerCase();
  if (extension === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png'].includes(extension)) return 'imagen';
  if (extension === 'txt') return 'texto';
  return 'ficha';
};

/** Etiqueta legible del formato, para la ficha de los archivos sin vista previa. */
export const etiquetaFormato = (archivoRef) => {
  const extension = String(archivoRef?.extension ?? extensionDe(archivoRef?.nombre)).toLowerCase();
  const nombres = {
    pdf: 'Documento PDF',
    doc: 'Documento de Word',
    docx: 'Documento de Word',
    xls: 'Planilla de Excel',
    xlsx: 'Planilla de Excel',
    ppt: 'Presentación de PowerPoint',
    pptx: 'Presentación de PowerPoint',
    txt: 'Texto plano',
    jpg: 'Imagen JPEG',
    jpeg: 'Imagen JPEG',
    png: 'Imagen PNG',
  };
  return nombres[extension] ?? (extension ? `Archivo .${extension}` : 'Archivo');
};
