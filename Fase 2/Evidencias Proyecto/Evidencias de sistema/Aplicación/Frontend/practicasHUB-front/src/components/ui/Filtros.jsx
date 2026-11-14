import Campo from './Campo';

// Componente de filtros, con campos de búsqueda y selección, resultados y acciones opcionales.

const Filtros = ({ campos, resultados = null, total = null, acciones = null }) => (
  <search className="ph-filtros" role="search">
    {campos.map((campo) => (
      <Campo
        key={campo.clave}
        id={`filtro-${campo.clave}`}
        etiqueta={campo.etiqueta}
        className="ph-filtros__campo"
      >
        {campo.opciones ? (
          <select
            id={`filtro-${campo.clave}`}
            className="ph-campo__control"
            value={campo.valor}
            onChange={(evento) => campo.alCambiar(evento.target.value)}
          >
            {campo.opciones.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        ) : (
          <input
            id={`filtro-${campo.clave}`}
            className="ph-campo__control"
            type={campo.tipo ?? 'search'}
            value={campo.valor}
            placeholder={campo.ejemplo}
            onChange={(evento) => campo.alCambiar(evento.target.value)}
          />
        )}
      </Campo>
    ))}

    {acciones}

    {resultados !== null && (
      <p className="ph-campo__ayuda" aria-live="polite">
        {total !== null && resultados !== total
          ? `${resultados} de ${total}`
          : `${resultados} ${resultados === 1 ? 'resultado' : 'resultados'}`}
      </p>
    )}
  </search>
);

export default Filtros;
