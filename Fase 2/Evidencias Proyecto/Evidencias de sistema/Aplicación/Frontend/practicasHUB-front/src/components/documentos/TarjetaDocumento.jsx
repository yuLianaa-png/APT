import { Boton, InsigniaEstado, Tabla } from '../ui';
import { DescargarArchivo } from '../archivos';
import CabeceraDocumento, { BotonVersiones } from './CabeceraDocumento';
import { documentoService } from '../../services';
import { ESTADO_ENTREGA, TIPO_DOCUMENTO } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';

// Tarjeta de un documento, con su archivo vigente y, si requiere entrega, la tabla de entregas.

const COLUMNAS_ENTREGA = [
  { clave: 'estudiante', titulo: 'Estudiante' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'version', titulo: 'Versión', numerica: true },
  { clave: 'fecha', titulo: 'Último envío' },
  { clave: 'acciones', titulo: 'Acciones', acciones: true },
];

const TarjetaDocumento = ({
  documento,
  entregas,
  soloLectura,
  motivoBloqueo,
  alCambiarArchivo,
  alVerVersiones,
  alVerEntrega = null,
}) => {
  const vigente = documentoService.versionVigente(documento);
  const requiereEntrega = documento.tipo === TIPO_DOCUMENTO.REQUIERE_ENTREGA;
  const entregadas = entregas.filter((e) => e.estado === ESTADO_ENTREGA.ENTREGADO).length;

  return (
    <article className="ph-tarjeta ph-pila">
      <CabeceraDocumento
        documento={documento}
        extra={requiereEntrega && (
          <p className="ph-campo__ayuda">
            {`${entregadas} de ${entregas.length} entregadas`}
          </p>
        )}
        acciones={(
          <>
            <DescargarArchivo archivo={vigente?.archivo} />
            <BotonVersiones documento={documento} alVer={alVerVersiones} />
            {/* en un grupo inactivo se consulta y se descarga, pero no se cambia. */}
            <Boton
              variante="secundario"
              tamano="pequeno"
              bloqueado={soloLectura}
              motivoBloqueo={motivoBloqueo}
              mostrarMotivo={false}
              onClick={() => alCambiarArchivo(documento)}
            >
              Cambiar archivo
            </Boton>
          </>
        )}
      />

      {requiereEntrega && (
        <Tabla
          titulo={`Entregas de ${documento.nombre}`}
          ocultarTitulo
          columnas={COLUMNAS_ENTREGA}
          filas={entregas}
          claveFila={(entrega) => entrega.vinculacionId}
          celda={(entrega, columna) => {
            switch (columna.clave) {
              case 'estudiante':
                return <strong>{entrega.estudianteNombre}</strong>;
              case 'estado':
                return (
                  <span className="ph-celda-principal">
                    <InsigniaEstado tipo="entrega" estado={entrega.estado} />
                    {entrega.comentarioCorreccion && (
                      <span className="ph-campo__ayuda">{entrega.comentarioCorreccion}</span>
                    )}
                  </span>
                );
              case 'version':
                return entrega.versionVigente > 0 ? `v${entrega.versionVigente}` : '—';
              case 'fecha':
                return entrega.ultimoEnvio ? formatearInstante(entrega.ultimoEnvio) : '—';
              case 'acciones':
                return alVerEntrega && entrega.versiones.length > 0
                  ? (
                    <Boton variante="secundario" tamano="pequeno" onClick={() => alVerEntrega(entrega)}>
                      Ver entrega
                    </Boton>
                  )
                  : <span className="ph-campo__ayuda">Sin enviar</span>;
              default:
                return null;
            }
          }}
        />
      )}
    </article>
  );
};

export default TarjetaDocumento;
