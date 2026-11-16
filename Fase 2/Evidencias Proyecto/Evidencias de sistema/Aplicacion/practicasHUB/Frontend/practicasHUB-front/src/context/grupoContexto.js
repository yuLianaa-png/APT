import { createContext } from 'react';

/**
 * El contexto del grupo cargado, separado del proveedor por la misma razón que
 * `authContexto.js`: un `.jsx` que exporta algo que no es un componente rompe Fast
 * Refresh y recarga la aplicación entera en cada cambio.
 */
export const GrupoContext = createContext(null);

export default GrupoContext;
