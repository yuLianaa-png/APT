/**
 * Archivos: validación en el cliente y subida (RNF-08, §7.1).
 *
 * `validar`, `esPrevisualizable` y los ayudantes de formato son reglas del dominio y no
 * dependen del backend: salen de `utils/archivos.js` en los dos modos. Solo la subida
 * cambia según `VITE_USAR_MOCKS`.
 *
 * El backend debe validar otra vez por su cuenta. El cliente nunca es la autoridad (§8).
 */
import { USAR_MOCKS } from './config';
import { archivoMock } from './mock/archivo.mock';
import { archivoHttp } from './http';
import {
  esPrevisualizable,
  etiquetaFormato,
  formatearTamano,
  modoVistaPrevia,
  validarArchivo,
} from '../utils/archivos';

export const archivoService = {
  validar: validarArchivo,
  esPrevisualizable,
  modoVistaPrevia,
  etiquetaFormato,
  formatearTamano,
  subir: USAR_MOCKS ? archivoMock.subir : archivoHttp.subir,
  obtenerUrlDescarga: USAR_MOCKS
    ? archivoMock.obtenerUrlDescarga
    : archivoHttp.obtenerUrlDescarga,
};

export default archivoService;
