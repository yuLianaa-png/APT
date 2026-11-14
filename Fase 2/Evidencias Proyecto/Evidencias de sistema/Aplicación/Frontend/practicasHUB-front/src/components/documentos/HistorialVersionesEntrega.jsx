import { Aviso, Boton, Modal, Tabla } from '../ui';
import { DescargarArchivo } from '../archivos';
import { formatearInstante } from '../../utils/fechas';
import { formatearTamano } from '../../utils/archivos';


 //Historial de versiones de una entrega.

const COLUMNAS = [
  { clave: 'numero', titulo: 'Versión', numerica: true },
  { clave: 'archivo', titulo: 'Archivo' },
  { clave: 'enviada', titulo: 'Enviada' },
  { clave: 'acciones', titulo: 'Acciones', acciones: true },
];

const HistorialVersionesEntrega = ({
  entrega,
  nombreDocumento,
  esPropia = true,
  alCerrar,
}) => (
  <Modal
    titulo={esPropia ? 'Historial de tu entrega' : 'Historial de la entrega'}
    apoyo={esPropia
      ? nombreDocumento
      : `${entrega.estudianteNombre} · ${nombreDocumento}`}
    alCerrar={alCerrar}
    pie={<Boton onClick={alCerrar}>Cerrar</Boton>}
  >
    <div className="ph-pila">
      <Tabla
        titulo={`Versiones enviadas de ${nombreDocumento}`}
        ocultarTitulo
        columnas={COLUMNAS}
        filas={[...entrega.versiones].sort((a, b) => b.numero - a.numero)}
        claveFila={(version) => version.numero}
        claseFila={(version) => (version.numero === entrega.versiones.length
          ? 'ph-tabla__fila--destacada'
          : undefined)}
        celda={(version, columna) => {
          switch (columna.clave) {
            case 'numero':
              return (
                <span className="ph-celda-principal">
                  <strong>{`v${version.numero}`}</strong>
                  {version.numero === entrega.versiones.length && (
                    <span className="ph-campo__ayuda">la vigente</span>
                  )}
                </span>
              );
            case 'archivo':
              return (
                <span className="ph-celda-principal">
                  <span>{version.archivo.nombre}</span>
                  <span className="ph-campo__ayuda">
                    {formatearTamano(version.archivo.tamanoBytes)}
                  </span>
                </span>
              );
            case 'enviada':
              return formatearInstante(version.enviadaEn);
            case 'acciones':
              return <DescargarArchivo archivo={version.archivo} />;
            default:
              return null;
          }
        }}
      />

      <Aviso>
        {esPropia
          ? `Tu entrega está asociada a la versión ${entrega.versionDocumentoUsada} de la plantilla. Ninguna versión que enviaste se elimina.`
          : `Esta entrega se hizo contra la versión ${entrega.versionDocumentoUsada} de la plantilla. Ninguna versión enviada se elimina.`}
      </Aviso>
    </div>
  </Modal>
);

export default HistorialVersionesEntrega;
