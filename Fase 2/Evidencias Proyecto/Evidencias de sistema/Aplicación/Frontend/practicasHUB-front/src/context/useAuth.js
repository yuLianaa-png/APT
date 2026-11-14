import { useContext } from 'react';
import { AuthContext } from './authContexto';

/**
 * Acceso a la sesión.
 *
 * Vive en su propio archivo porque `AuthContext.jsx` solo debe exportar componentes: si
 * exporta además un hook, Fast Refresh deja de funcionar en ese archivo y cada cambio
 * recarga la aplicación entera perdiendo el estado.
 */
export const useAuth = () => {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.');
  }
  return contexto;
};

export default useAuth;
