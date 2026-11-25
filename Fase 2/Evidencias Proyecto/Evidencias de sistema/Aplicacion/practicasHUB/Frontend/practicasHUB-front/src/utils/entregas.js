import { ESTADO_ENTREGA } from './constants';

/**
 * Una entrega queda desactualizada cuando el docente cambia el archivo del documento después de
 * que el estudiante entregó: la entrega se hizo contra una versión anterior y hay que volver a
 * entregar. Las versiones ya enviadas no se borran; solo cambia el estado a Pendiente.
 */
export const entregaDesactualizada = (entrega, versionVigente) =>
  entrega?.estado === ESTADO_ENTREGA.ENTREGADO
  && Number(entrega.versionDocumentoUsada) < Number(versionVigente);

/** La entrega con el estado que corresponde a la versión vigente del documento. */
export const conVersionVigente = (entrega, versionVigente) => (
  entregaDesactualizada(entrega, versionVigente)
    ? { ...entrega, estado: ESTADO_ENTREGA.PENDIENTE, desactualizada: true }
    : { ...entrega, desactualizada: false }
);
