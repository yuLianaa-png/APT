import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { notificacionService } from '../services';

/** Evento que avisa al menú que las notificaciones se marcaron como leídas. */
const EVENTO_LEIDAS = 'ph:notificaciones-leidas';

/** Lo llaman las páginas de notificaciones después de marcarlas como leídas. */
export const avisarNotificacionesLeidas = () => {
  window.dispatchEvent(new Event(EVENTO_LEIDAS));
};

/**
 * Cuántas notificaciones sin leer tiene el usuario, para el contador del menú lateral.
 *
 * Se vuelve a consultar:
 *  - cada `intervaloMs` (por omisión 30 s), para que una notificación nueva aparezca sola;
 *  - al cambiar de página, porque es cuando el usuario mira el menú;
 *  - al instante cuando una página de notificaciones avisa que las marcó como leídas.
 *
 * @param {string|null} grupoId con grupo, solo cuenta las de ese grupo; sin él, todas.
 */
export const useNoLeidas = (grupoId = null, intervaloMs = 30_000) => {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!usuario?.id) return undefined;
    let vigente = true;

    const consultar = () => {
      notificacionService.noLeidas(usuario.id, grupoId)
        .then((cantidad) => { if (vigente) setTotal(cantidad); })
        // Si falla, el contador se queda como estaba: no vale la pena mostrar un error.
        .catch(() => {});
    };

    consultar();
    const intervalo = setInterval(consultar, intervaloMs);
    window.addEventListener(EVENTO_LEIDAS, consultar);

    return () => {
      vigente = false;
      clearInterval(intervalo);
      window.removeEventListener(EVENTO_LEIDAS, consultar);
    };
  }, [usuario?.id, grupoId, intervaloMs, pathname]);

  return total;
};

export default useNoLeidas;
