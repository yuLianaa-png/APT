// Componente de carga, con un giro animado y un mensaje. Se usa para indicar que la página está esperando datos.

const Cargando = ({ mensaje = 'Cargando…' }) => (
  <div className="ph-cargando" role="status" aria-live="polite">
    <span className="ph-cargando__giro" aria-hidden="true" />
    <span>{mensaje}</span>
  </div>
);

/**
 * Esqueleto de tabla, para no mover la página cuando llegan los datos.
 * Es decorativo: el anuncio lo hace el `Cargando` que lo acompaña.
 */
export const EsqueletoFilas = ({ filas = 4 }) => (
  <div className="ph-pila" aria-hidden="true">
    {Array.from({ length: filas }, (_, indice) => (
      <div
        key={indice}
        className="ph-esqueleto"
        style={{ width: `${100 - indice * 6}%` }}
      />
    ))}
  </div>
);

export default Cargando;
