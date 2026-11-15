import { Aviso, Boton, InsigniaEstado, Modal } from '../ui';
import { DescargarArchivo, VistaPrevia } from '../archivos';
import { ESTADO_ENTREGA, MOTIVOS_BLOQUEO } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';


 //La entrega de un estudiante, abierta por el docente.

const DetalleEntregaDocente = ({
  entrega,
  nombreDocumento,
  soloLectura,
  alSolicitarCorreccion,
  alVerHistorial,
  alCerrar,
}) => {
  const ultima = entrega.versiones.at(-1) ?? null;
  const yaPedida = entrega.estado === ESTADO_ENTREGA.CORRECCION_SOLICITADA;

  return (
    <Modal
      titulo="Entrega del estudiante"
      apoyo={`${entrega.estudianteNombre} · ${nombreDocumento}`}
      alCerrar={alCerrar}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar}>Cerrar</Boton>
          {entrega.versiones.length > 1 && (
            <Boton variante="tenue" onClick={() => alVerHistorial(entrega)}>
              {`Ver ${entrega.versiones.length} versiones`}
            </Boton>
          )}
          <Boton
            bloqueado={soloLectura || yaPedida}
            motivoBloqueo={soloLectura
              ? MOTIVOS_BLOQUEO.GRUPO_INACTIVO
              : 'Ya le pediste una corrección y está esperando su respuesta.'}
            mostrarMotivo={false}
            onClick={() => alSolicitarCorreccion(entrega)}
          >
            Solicitar corrección
          </Boton>
        </>
      )}
    >
      <div className="ph-pila">
        {soloLectura && (
          <Aviso titulo="Este grupo está inactivo">
            Puedes revisar y descargar la entrega, pero no pedir correcciones. Para hacerlo,
            reactiva el grupo desde el Dashboard general.
          </Aviso>
        )}

        {yaPedida && (
          <Aviso tono="espera" titulo="Ya pediste una corrección">
            {`«${entrega.comentarioCorreccion}» — ${entrega.estudianteNombre} puede reemplazar su archivo. Hasta que lo haga, sigue vigente la versión ${entrega.versiones.length}.`}
          </Aviso>
        )}

        <dl className="ph-ficha">
          <div>
            <dt>Estudiante</dt>
            <dd><strong>{entrega.estudianteNombre}</strong></dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd><InsigniaEstado tipo="entrega" estado={entrega.estado} /></dd>
          </div>
          <div>
            <dt>Versión</dt>
            <dd>{`v${entrega.versiones.length} de ${entrega.versiones.length}`}</dd>
          </div>
          <div>
            <dt>Enviada</dt>
            <dd>{formatearInstante(ultima?.enviadaEn)}</dd>
          </div>
          <div>
            <dt>Plantilla usada</dt>
            <dd>{`Versión ${entrega.versionDocumentoUsada} del documento`}</dd>
          </div>
        </dl>

        {/* §5.24: previsualizar antes de decidir. */}
        <div>
          <h3 className="ph-tarjeta__titulo">Contenido entregado</h3>
          <VistaPrevia archivo={ultima?.archivo} alto={360} />
        </div>

        <div className="ph-fila">
          <DescargarArchivo
            archivo={ultima?.archivo}
            etiqueta="Descargar la entrega"
            tamano="normal"
          />
        </div>
      </div>
    </Modal>
  );
};

export default DetalleEntregaDocente;
