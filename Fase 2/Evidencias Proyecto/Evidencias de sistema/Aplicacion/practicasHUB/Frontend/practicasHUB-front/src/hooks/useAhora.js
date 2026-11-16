import { useEffect, useState } from 'react';
import { relojService } from '../services';

/**
 * El instante actual, como **estado** que se refresca solo.
 *
 * Parece más simple escribir `const ahora = relojService.ahora()` dentro del componente,
 * y está mal por dos razones:
 *
 * 1. **El React Compiler lo memoriza.** Este proyecto tiene `babel-plugin-react-compiler`
 *    activado (`vite.config.js`). Una llamada sin argumentos que el compilador considera
 *    pura se cachea entre renders, así que el componente se queda con la hora del primer
 *    render. Se detectó al probar M-08: `window.__mock.avanzarReloj(25*3600)` movía el
 *    reloj —el servicio devolvía la hora desplazada— pero la tabla seguía mostrando el
 *    plazo antiguo. Ver `Trampas/2026-11-13--react-compiler-memoriza-la-lectura-del-reloj`.
 * 2. **Nada volvería a renderizar.** Aunque no se memorizara, el paso del tiempo no
 *    provoca renders por sí solo: el plazo mostrado se congelaría hasta que el usuario
 *    tocara algo.
 *
 * Con esto, «te quedan 3 h» baja a «te quedan 2 h» sola, y la fila cuyo plazo vence deja
 * de ofrecer *Editar* sin que nadie recargue.
 *
 * @param {number} intervaloMs cada cuánto refrescar. Por omisión 30 s, que sobra para
 *                             una cuenta atrás en horas y no hace trabajar a la pestaña.
 */
export const useAhora = (intervaloMs = 30_000) => {
  const [ahora, setAhora] = useState(() => relojService.ahora());

  useEffect(() => {
    const id = setInterval(() => setAhora(relojService.ahora()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);

  /** Para refrescar al instante tras una acción, sin esperar al siguiente tic. */
  const refrescar = () => setAhora(relojService.ahora());

  return [ahora, refrescar];
};

export default useAhora;
