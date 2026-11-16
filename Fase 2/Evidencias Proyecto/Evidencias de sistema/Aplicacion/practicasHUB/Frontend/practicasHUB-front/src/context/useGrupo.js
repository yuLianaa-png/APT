import { useContext } from 'react';
import { GrupoContext } from './grupoContexto';

/**
 * El grupo cargado: `{ grupo, vinculacion, cargando, error, soloLectura, recargar }`.
 *
 * Solo funciona dentro de una ruta de grupo. Si se usa fuera, avisa en lugar de devolver
 * `null` y dejar que la pantalla reviente diez líneas más abajo.
 */
export const useGrupo = () => {
  const contexto = useContext(GrupoContext);
  if (!contexto) {
    throw new Error('useGrupo debe usarse dentro de una ruta de grupo (GrupoProvider).');
  }
  return contexto;
};

export default useGrupo;
