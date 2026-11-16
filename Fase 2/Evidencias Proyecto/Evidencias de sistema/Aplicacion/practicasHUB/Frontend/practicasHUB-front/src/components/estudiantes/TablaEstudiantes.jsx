import { Boton, Tabla } from '../ui';
import { formatearHoras } from '../../utils/horas';
import { formatearFecha } from '../../utils/fechas';

// Tabla de estudiantes de un grupo, con sus horas y jornadas registradas, y sus entregas pendientes.

const TablaEstudiantes = ({
  estudiantes,
  grupo,
  columnas,
  celdaExtra,
  accion = null,
  vacio,
  titulo,
}) => (
  <Tabla
    titulo={titulo}
    ocultarTitulo
    columnas={columnas}
    filas={estudiantes}
    claveFila={(fila) => fila.vinculacionId}
    vacio={vacio}
    celda={(fila, columna) => {
      switch (columna.clave) {
        case 'nombre':
          return (
            <span className="ph-celda-principal">
              <strong>{fila.nombre}</strong>
              <span className="ph-campo__ayuda">{fila.correo}</span>
            </span>
          );
        case 'vinculadoEn':
          return formatearFecha(fila.vinculadoEn?.slice(0, 10));
        case 'horas':
          return (
            <span className="ph-celda-principal">
              <span>{`${formatearHoras(fila.registradas)} / ${formatearHoras(grupo.metaMinimaHoras)} h`}</span>
              {fila.metaAlcanzada && <span className="ph-campo__ayuda">meta alcanzada</span>}
            </span>
          );
        case 'jornadas':
          return fila.totalJornadas;
        case 'solicitudes':
          return fila.solicitudesPendientes > 0
            ? <strong>{fila.solicitudesPendientes}</strong>
            : '0';
        case 'correcciones':
          return fila.correccionesHabilitadas > 0
            ? <strong>{fila.correccionesHabilitadas}</strong>
            : '0';
        case 'accion':
          return accion ? accion(fila) : null;
        default:
          return celdaExtra ? celdaExtra(fila, columna) : null;
      }
    }}
  />
);

/** Botón de acción de una fila, como elemento aparte para no repetirlo. */
export const AccionVerJornadas = ({ fila, alVer }) => (
  <Boton tamano="pequeno" variante="secundario" onClick={() => alVer(fila)}>
    Ver jornadas
  </Boton>
);

export default TablaEstudiantes;
