/**
 * Configuración de la capa de datos.
 *
 * Mientras la API de Spring Boot no exista, el frontend trabaja contra el almacén
 * simulado de `services/mock/`. El interruptor es una variable de entorno de Vite, no
 * una constante escondida en el código, para que enchufar el backend no obligue a
 * tocar ninguna pantalla (RNF-06).
 *
 *   VITE_USAR_MOCKS=false  → usa la API real en VITE_API_URL
 *   VITE_USAR_MOCKS=true   → usa el almacén simulado (valor por omisión, hoy)
 *
 * El valor por omisión es `true` porque todavía no hay backend. Cuando lo haya, la
 * variable debe pasar a `false` en los entornos desplegados: el mock no tiene
 * autorización ni valida contraseñas y nunca debe quedar encendido fuera de desarrollo.
 */

const lee = (clave) => {
  try {
    return import.meta.env?.[clave];
  } catch {
    return undefined;
  }
};

export const USAR_MOCKS = String(lee('VITE_USAR_MOCKS') ?? 'true') !== 'false';

export const API_URL = lee('VITE_API_URL') ?? 'http://localhost:8080/api';

export const ES_DESARROLLO = Boolean(lee('DEV'));
