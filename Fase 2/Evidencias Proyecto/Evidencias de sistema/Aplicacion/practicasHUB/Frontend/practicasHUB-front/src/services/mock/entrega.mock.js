/**
 * Entregas documentales individuales (RF-15, RN-19, RN-20, §4.12, §4.13, §5.24, §5.25).
 *
 * RN-19: la publicación es común al código, la entrega es de cada estudiante. Revisar,
 *        corregir o reemplazar una entrega no afecta a las de los demás.
 * RN-20: cada reemplazo crea una versión nueva y conserva las anteriores.
 * §4.13: el reemplazo aparece SOLO cuando el docente lo habilita con un comentario.
 *
 * Decisión A-02: «habilitar reemplazo» (§5.12) y «solicitar corrección documental»
 * (§5.25) son la misma acción. Aquí existe una sola: `solicitarCorreccion`.
 */

import {
  ERRORES,
  ESTADO_ENTREGA,
  TIPO_NOTIFICACION,
  TIPO_REFERENCIA,
} from '../../utils/constants';
import { listar, porId, transaccion } from './db';
import { ahoraISO } from './reloj';
import {
  ErrorServicio, exigirExista, exigirGrupoActivo, fallar, notificar, responder,
} from './soporte';

/** Todas las entregas de un documento. Para la tarjeta del docente (§5.18). */
export const listarPorDocumento = (documentoId) =>
  responder(listar('entregas').filter((entrega) => entrega.documentoId === documentoId));

/** RN-17: la entrega propia del estudiante, la única a la que tiene acceso. */
export const deEstudiante = (documentoId, estudianteId) =>
  responder(
    listar('entregas').find((entrega) => entrega.documentoId === documentoId
      && entrega.estudianteId === estudianteId) ?? null,
  );

export const obtener = (entregaId) => {
  const entrega = porId('entregas', entregaId);
  if (!entrega) return fallar(ERRORES.NO_ENCONTRADO, 'La entrega no existe.');
  return responder(entrega);
};

/** Resuelve entrega, documento y grupo, comprobando que el grupo admite escritura. */
const contexto = (datos, entregaId) => {
  const entrega = exigirExista(
    datos.entregas.find((candidata) => candidata.id === entregaId),
    'La entrega no existe.',
  );
  const documento = exigirExista(
    datos.documentos.find((candidato) => candidato.id === entrega.documentoId),
    'El documento no existe.',
  );
  const grupo = exigirGrupoActivo(
    datos.grupos.find((candidato) => candidato.id === documento.grupoId),
  );
  return { entrega, documento, grupo };
};

/**
 * §4.12 y §4.13. Envía la entrega o la reemplaza.
 *
 * El primer envío se permite si está PENDIENTE. Un reemplazo solo si el docente lo
 * habilitó, es decir si está en CORRECCION_SOLICITADA: una entrega ya ENTREGADO no se
 * puede sustituir por iniciativa del estudiante.
 */
export const enviar = (entregaId, archivo, estudianteId = null) => {
  if (!archivo) {
    return fallar(ERRORES.ARCHIVO_INVALIDO, 'Selecciona el archivo que quieres entregar.');
  }

  try {
    const actualizada = transaccion((datos) => {
      const { entrega, documento, grupo } = contexto(datos, entregaId);

      // RN-17: nadie entrega en nombre de otro.
      if (estudianteId && entrega.estudianteId !== estudianteId) {
        throw new ErrorServicio(
          ERRORES.NO_AUTORIZADO,
          'Solo puedes gestionar tu propia entrega.',
        );
      }

      if (entrega.estado === ESTADO_ENTREGA.ENTREGADO) {
        throw new ErrorServicio(
          ERRORES.NO_AUTORIZADO,
          'Tu entrega ya está enviada. El reemplazo solo se habilita si el docente pide una corrección.',
        );
      }

      const numero = entrega.versiones.length + 1;
      entrega.versiones.push({ numero, archivo, enviadaEn: ahoraISO() });
      entrega.estado = ESTADO_ENTREGA.ENTREGADO;
      entrega.comentarioCorreccion = null;
      // La entrega queda asociada a la versión del documento vigente al enviarla (§5.23).
      entrega.versionDocumentoUsada = documento.versionVigente;

      const estudiante = datos.usuarios.find((u) => u.id === entrega.estudianteId);
      notificar(datos, {
        destinatarioId: grupo.docenteId,
        grupo,
        tipo: TIPO_NOTIFICACION.ENTREGA_RECIBIDA,
        mensaje: numero === 1
          ? `${estudiante?.nombre ?? 'Un estudiante'} entregó «${documento.nombre}».`
          : `${estudiante?.nombre ?? 'Un estudiante'} envió la versión ${numero} de «${documento.nombre}».`,
        referencia: { tipo: TIPO_REFERENCIA.ENTREGA, id: entrega.id },
      });

      return entrega;
    });

    return responder(actualizada);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * §5.25 y §5.12, que son la misma acción (A-02). El comentario es obligatorio.
 * La entrega vigente sigue disponible hasta que llegue la nueva versión.
 */
export const solicitarCorreccion = (entregaId, comentario, docenteId = null) => {
  const texto = String(comentario ?? '').trim();
  if (!texto) {
    return fallar(
      ERRORES.NO_AUTORIZADO,
      'Describe qué debe corregir el estudiante antes de habilitar el reemplazo.',
    );
  }

  try {
    const actualizada = transaccion((datos) => {
      const { entrega, documento, grupo } = contexto(datos, entregaId);

      // RN-18: el docente solo actúa sobre los grupos de su cuenta.
      if (docenteId && grupo.docenteId !== docenteId) {
        throw new ErrorServicio(
          ERRORES.NO_AUTORIZADO,
          'Solo el docente responsable del grupo puede pedir esta corrección.',
        );
      }

      if (entrega.estado !== ESTADO_ENTREGA.ENTREGADO) {
        throw new ErrorServicio(
          ERRORES.NO_AUTORIZADO,
          'Solo se puede pedir corrección de una entrega ya enviada.',
        );
      }

      entrega.estado = ESTADO_ENTREGA.CORRECCION_SOLICITADA;
      entrega.comentarioCorreccion = texto;

      notificar(datos, {
        destinatarioId: entrega.estudianteId,
        grupo,
        tipo: TIPO_NOTIFICACION.REEMPLAZO_HABILITADO,
        mensaje: `Se pidió una corrección de tu entrega de «${documento.nombre}»: ${texto}`,
        referencia: { tipo: TIPO_REFERENCIA.ENTREGA, id: entrega.id },
      });

      return entrega;
    });

    return responder(actualizada);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * Los cuatro indicadores de la vista Documentos del estudiante (§4.11).
 * Decisión A-05: el manual no los nombra; se derivan por simetría con §5.4.
 */
export const indicadores = (estudianteId, grupoId) => {
  const documentos = listar('documentos').filter((documento) => documento.grupoId === grupoId);
  const idsDocumento = new Set(documentos.map((documento) => documento.id));
  const propias = listar('entregas')
    .filter((entrega) => entrega.estudianteId === estudianteId
      && idsDocumento.has(entrega.documentoId));

  return responder({
    documentosDelGrupo: documentos.length,
    entregasPendientes: propias.filter((e) => e.estado === ESTADO_ENTREGA.PENDIENTE).length,
    entregasRealizadas: propias.filter((e) => e.estado === ESTADO_ENTREGA.ENTREGADO).length,
    correccionesSolicitadas: propias
      .filter((e) => e.estado === ESTADO_ENTREGA.CORRECCION_SOLICITADA).length,
  });
};

export const entregaMock = {
  listarPorDocumento,
  deEstudiante,
  obtener,
  enviar,
  solicitarCorreccion,
  indicadores,
};
