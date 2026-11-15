// Componente de indicador, con una etiqueta, un valor, un detalle opcional y una barra de progreso opcional. Se usa para mostrar métricas o estadísticas.

const Indicador = ({ etiqueta, valor, detalle = null, avance = null }) => (
  <div className="ph-indicador">
    <span className="ph-indicador__etiqueta">{etiqueta}</span>
    <strong className="ph-indicador__valor">{valor}</strong>
    {detalle && <span className="ph-indicador__detalle">{detalle}</span>}

    {avance !== null && (
      <div
        className="ph-indicador__barra"
        role="progressbar"
        aria-valuenow={Math.round(avance)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Avance: ${Math.round(avance)} por ciento de la meta mínima`}
      >
        <span style={{ width: `${Math.min(100, Math.max(0, avance))}%` }} />
      </div>
    )}
  </div>
);

/** Rejilla de indicadores. Se adapta sola de cuatro columnas a una en móvil. */
export const Indicadores = ({ children }) => (
  <div className="ph-indicadores">{children}</div>
);

export default Indicador;
