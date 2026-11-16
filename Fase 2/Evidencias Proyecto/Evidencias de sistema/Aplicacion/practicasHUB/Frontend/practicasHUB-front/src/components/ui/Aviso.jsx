/**
 * Aviso en línea: confirmaciones, advertencias y mensajes de contexto.
 *
 * Los de tono `error` y `espera` se anuncian con `role="alert"` para que un lector de
 * pantalla los lea en cuanto aparecen, que es lo que se espera de un mensaje de
 * validación. Los informativos no interrumpen.
 */
const ICONOS = {
  info: 'i',
  exito: '✓',
  espera: '!',
  error: '⚠',
};

const Aviso = ({ tono = 'info', titulo = null, children }) => (
  <div
    className={tono === 'info' ? 'ph-aviso' : `ph-aviso ph-aviso--${tono}`}
    role={tono === 'error' || tono === 'espera' ? 'alert' : undefined}
  >
    <span aria-hidden="true">{ICONOS[tono] ?? ICONOS.info}</span>
    <span className="ph-aviso__cuerpo">
      {titulo && <strong className="ph-aviso__titulo">{titulo}</strong>}
      {children && <span>{children}</span>}
    </span>
  </div>
);

export default Aviso;
