import { Aviso, Boton, Modal, Tabla } from '../ui';
import { DescargarArchivo } from '../archivos';
import { formatearInstante } from '../../utils/fechas';
import { formatearTamano } from '../../utils/archivos';


// Historial de versiones del archivo publicado .

const COLUMNAS = [
  { clave: 'numero', titulo: 'Versión', numerica: true },
  { clave: 'archivo', titulo: 'Archivo' },
  { clave: 'publicada', titulo: 'Publicada' },
  { clave: 'acciones', titulo: 'Acciones', acciones: true },
];

const HistorialVersionesDocumento = ({ documento, alCerrar }) => (
  <Modal
    titulo="Historial de versiones"
    apoyo={documento.nombre}
    alCerrar={alCerrar}
    pie={<Boton onClick={alCerrar}>Cerrar</Boton>}
  >
    <div className="ph-pila">
      <Tabla
        titulo={`Versiones publicadas de ${documento.nombre}`}
        ocultarTitulo
        columnas={COLUMNAS}
        // La más reciente arriba, que es la que se busca.
        filas={[...documento.versiones].sort((a, b) => b.numero - a.numero)}
        claveFila={(version) => version.numero}
        claseFila={(version) => (version.numero === documento.versionVigente
          ? 'ph-tabla__fila--destacada'
          : undefined)}
        celda={(version, columna) => {
          switch (columna.clave) {
            case 'numero':
              return (
                <span className="ph-celda-principal">
                  <strong>{`v${version.numero}`}</strong>
                  {version.numero === documento.versionVigente && (
                    <span className="ph-campo__ayuda">vigente</span>
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
            case 'publicada':
              return formatearInstante(version.publicadaEn);
            case 'acciones':
              return <DescargarArchivo archivo={version.archivo} />;
            default:
              return null;
          }
        }}
      />

      <Aviso>
        Las versiones anteriores no se eliminan. Si un estudiante entregó contra una
        versión previa, su entrega sigue asociada a la que usó.
      </Aviso>
    </div>
  </Modal>
);

export default HistorialVersionesDocumento;
