import axios from 'axios';
import { ERRORES, STORAGE_KEYS } from '../utils/constants';
import { API_URL } from './config';

// La URL del backend viene del entorno (VITE_API_URL), nunca cableada: el mismo build
// tiene que servir para local, Render y cualquier otro entorno (RNF-07).
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Mensaje legible de un error del backend. Los microservicios responden de tres formas:
 * texto plano (`ResponseEntity.badRequest().body("...")`), `{ message }` (los
 * GlobalExceptionHandler) o `{ mensaje }`.
 */
const SERVIDOR_INICIANDO = 'El servidor está iniciando. Intenta nuevamente en un minuto.';

const mensajeDelError = (error) => {
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente en un minuto.';
  }

  // 502, 503 y 504 los responde el hosting (Render) mientras un servicio despierta o se
  // reinicia: el cuerpo es su página HTML de error, que no sirve para el usuario.
  if ([502, 503, 504].includes(error.response.status)) return SERVIDOR_INICIANDO;

  const cuerpo = error.response.data;
  let texto = '';
  if (typeof cuerpo === 'string') texto = cuerpo;
  else if (cuerpo) texto = cuerpo.message ?? cuerpo.mensaje ?? '';

  // Los GlobalExceptionHandler anteponen este prefijo a los errores no controlados.
  texto = String(texto).replace(/^Ocurrió un error interno en el servidor:\s*/i, '').trim();

  // Una página HTML nunca es un mensaje para mostrar.
  if (/^\s*<(!doctype|html)/i.test(texto)) return SERVIDOR_INICIANDO;
  if (texto) return texto;
  if (error.response.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error.response.status === 403) return 'No tienes permiso para realizar esta acción.';
  return 'Ocurrió un error inesperado. Inténtalo otra vez.';
};

const codigoDelError = (status) => {
  if (status === 404) return ERRORES.NO_ENCONTRADO;
  return ERRORES.NO_AUTORIZADO;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // En /auth/* un 401 significa «credenciales incorrectas», no «sesión vencida»: no se
    // redirige para que el formulario pueda mostrar el error.
    const esAcceso = String(error.config?.url ?? '').startsWith('/auth/');

    // Solo 401 cierra la sesión. El backend usa 403 para reglas de negocio («solo los
    // profesores pueden…»), y eso no debe sacar al usuario de la aplicación.
    if (status === 401 && !esAcceso) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      window.location.href = '/login';
    }

    // Misma forma que los servicios simulados: `{ codigo, mensaje }`.
    error.mensaje = mensajeDelError(error);
    error.codigo = codigoDelError(status);
    return Promise.reject(error);
  },
);

export default api;
