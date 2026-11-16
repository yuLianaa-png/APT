/**
 * Herramientas de consola del almacén simulado.
 *
 * Se instalan solo cuando `VITE_USAR_MOCKS` está encendido, y sirven para verificar sin
 * backend reglas que de otro modo exigirían esperar un día entero:
 *
 *   window.__mock.volcar()             ver todas las colecciones
 *   window.__mock.reiniciar()          volver a la semilla
 *   window.__mock.vaciar()             dejar el almacén sin datos
 *   window.__mock.avanzarReloj(25*3600)   adelantar 25 h y cerrar la ventana de 24 h
 *   window.__mock.reiniciarReloj()     volver a la hora real
 *   window.__mock.ahora()              instante que ve el dominio
 *
 * Tras mover el reloj o reiniciar hay que recargar la vista para ver el efecto: los
 * datos ya cargados en pantalla no se enteran solos.
 */

import { USAR_MOCKS } from './config';
import { reiniciar, vaciar, volcar, CLAVE_ALMACEN } from './mock/db';
import { ahora, avanzar, desfaseSegundos, reiniciarReloj } from './mock/reloj';

export const instalarConsolaMock = () => {
  if (!USAR_MOCKS || typeof window === 'undefined') return;

  window.__mock = {
    volcar,
    reiniciar,
    vaciar,
    avanzarReloj: avanzar,
    reiniciarReloj,
    ahora,
    desfaseSegundos,
    CLAVE_ALMACEN,
  };

  console.info(
    '[PrácticasHub] Datos simulados activos (VITE_USAR_MOCKS). '
    + 'Herramientas en window.__mock — reiniciar(), avanzarReloj(25*3600), volcar().',
  );
};
