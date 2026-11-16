import { useId } from 'react';


const Boton = ({
  children,
  variante = 'primario',
  tamano = 'normal',
  bloqueado = false,
  motivoBloqueo = null,
  mostrarMotivo = true,
  ancho = false,
  type = 'button',
  onClick,
  className = '',
  ...resto
}) => {
  const idMotivo = useId();
  const hayMotivo = bloqueado && Boolean(motivoBloqueo);

  const clases = [
    'ph-boton',
    variante !== 'primario' ? `ph-boton--${variante}` : '',
    tamano === 'pequeno' ? 'ph-boton--pequeno' : '',
    ancho ? 'ph-boton--ancho' : '',
    className,
  ].filter(Boolean).join(' ');

  const alPulsar = (evento) => {
    if (bloqueado) {
      evento.preventDefault();
      evento.stopPropagation();
      return;
    }
    onClick?.(evento);
  };

  const boton = (
    <button
      type={type}
      className={clases}
      aria-disabled={bloqueado || undefined}
      aria-describedby={hayMotivo ? idMotivo : undefined}
      onClick={alPulsar}
      {...resto}
    >
      {children}
    </button>
  );

  // Sin motivo visible no hace falta envolverlo: el botón va solo en la celda.
  if (!hayMotivo) return boton;

  // El motivo se enlaza siempre; `mostrarMotivo={false}` lo deja solo para lectores de
  // pantalla, para cuando la tabla no tiene sitio para una línea más.
  return (
    <span className="ph-boton-envoltura">
      {boton}
      <span
        id={idMotivo}
        className={mostrarMotivo ? 'ph-boton-motivo' : 'ph-solo-lectores'}
      >
        {motivoBloqueo}
      </span>
    </span>
  );
};

export default Boton;
