// Componente de tabla genérica, con título, columnas y filas. Se usa en jornadas, solicitudes y entregas.

const Tabla = ({
  titulo,
  ocultarTitulo = false,
  columnas,
  filas,
  claveFila,
  celda,
  claseFila = null,
  vacio = null,
}) => {
  if (filas.length === 0 && vacio) return vacio;

  return (
    <div className="ph-tabla-marco">
      <table className="ph-tabla">
        <caption className={ocultarTitulo ? 'ph-solo-lectores' : undefined}>
          {titulo}
        </caption>

        <thead>
          <tr>
            {columnas.map((columna) => (
              <th key={columna.clave} scope="col" style={columna.ancho ? { width: columna.ancho } : undefined}>
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filas.map((fila, indice) => (
            <tr key={claveFila(fila, indice)} className={claseFila ? claseFila(fila) : undefined}>
              {columnas.map((columna, posicion) => {
                const contenido = celda(fila, columna, indice);
                const clases = [
                  columna.numerica ? 'ph-tabla__numero' : '',
                  columna.acciones ? 'ph-tabla__acciones' : '',
                ].filter(Boolean).join(' ') || undefined;

                // La primera columna es la cabecera de su fila: así el lector de
                // pantalla dice de qué jornada o de qué grupo está leyendo los datos.
                return posicion === 0
                  ? <th key={columna.clave} scope="row" className={clases}>{contenido}</th>
                  : <td key={columna.clave} className={clases}>{contenido}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Tabla;
