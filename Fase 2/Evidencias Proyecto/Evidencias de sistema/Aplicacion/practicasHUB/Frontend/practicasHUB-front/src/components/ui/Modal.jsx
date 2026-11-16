import { useCallback, useEffect, useId, useRef } from 'react';

const FOCALIZABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Componente de modal, con título, apoyo opcional, contenido, pie opcional y botón de cierre. Se bloquea el fondo y se devuelve el foco al elemento que lo abrió.

const Modal = ({
  titulo,
  apoyo = null,
  children,
  pie = null,
  alCerrar,
  cerrarAlPulsarFuera = true,
  etiquetaCerrar = 'Cerrar',
}) => {
  const idTitulo = useId();
  const caja = useRef(null);
  const devolverFocoA = useRef(null);

  const alPulsarTecla = useCallback((evento) => {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      alCerrar?.();
      return;
    }

    if (evento.key !== 'Tab' || !caja.current) return;

    const focalizables = [...caja.current.querySelectorAll(FOCALIZABLES)]
      .filter((elemento) => elemento.getAttribute('aria-hidden') !== 'true');
    if (focalizables.length === 0) return;

    const primero = focalizables[0];
    const ultimo = focalizables[focalizables.length - 1];

    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }, [alCerrar]);

  useEffect(() => {
    devolverFocoA.current = document.activeElement;

    // El primer foco va al contenido, no al botón de cerrar: así se lee el título antes
    // de ofrecer la salida.
    const primero = caja.current?.querySelector(FOCALIZABLES);
    (primero ?? caja.current)?.focus();

    const desbordeOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = desbordeOriginal;
      // Puede que el elemento que abrió el modal ya no exista.
      if (devolverFocoA.current?.isConnected) devolverFocoA.current.focus();
    };
  }, []);

  return (
    <div
      className="ph-modal-fondo"
      onMouseDown={(evento) => {
        if (cerrarAlPulsarFuera && evento.target === evento.currentTarget) alCerrar?.();
      }}
    >
      {/*
        El `onKeyDown` va en el contenedor del diálogo a propósito: atrapa Tab y Escape
        para todo el modal. No es un elemento no interactivo con un manejador suelto —
        es el propio diálogo, con `role="dialog"` y `tabIndex={-1}` para poder recibir
        el foco inicial.
      */}
      <div
        ref={caja}
        className="ph-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={alPulsarTecla}
      >
        <div className="ph-modal__cabecera">
          <div>
            <h2 id={idTitulo}>{titulo}</h2>
            {apoyo && <p className="ph-modal__apoyo">{apoyo}</p>}
          </div>
          <button
            type="button"
            className="ph-modal__cerrar"
            onClick={() => alCerrar?.()}
            aria-label={etiquetaCerrar}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="ph-modal__cuerpo">{children}</div>

        {pie && <div className="ph-modal__pie">{pie}</div>}
      </div>
    </div>
  );
};

export default Modal;
