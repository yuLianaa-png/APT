import { createContext } from 'react';

/**
 * El contexto en su propio archivo, separado del proveedor.
 *
 * Un archivo `.jsx` que exporta un componente y además otra cosa —un contexto, un hook—
 * rompe Fast Refresh: cada cambio recarga la aplicación entera y se pierde el estado,
 * incluida la sesión. Por eso el contexto vive aquí, el proveedor en `AuthContext.jsx`
 * y el hook en `useAuth.js`.
 */
export const AuthContext = createContext(null);

export default AuthContext;
