/**
 * Documentos publicados por el docente (RF-14, RN-19, RN-20, §5.18 a §5.23, §5.26).
 *
 * RN-19: el documento pertenece al CÓDIGO y lo ven todos los estudiantes vinculados.
 *        Las entregas, en cambio, son individuales (ver `entrega.mock.js`).
 * RN-20: cambiar el archivo crea una versión nueva y NO elimina las anteriores. Las
 *        entregas ya enviadas quedan asociadas a la versión que usaron (§5.23).
 * §5.21: quien se vincule después también accede a las publicaciones vigentes.
 *
 * Decisión A-08: la publicación está siempre `Publicado` y lleva número de versión;
 * `Versionado` no es un estado, es el hecho de tener historial.
 */

import {
  ERRORES,
  ESTADO_ENTREGA,
  TIPO_DOCUMENTO,
  TIPO_NOTIFICACION,
  TIPO_REFERENCIA,
} from '../../utils/constants';
import { listar, nuevoId, porId, transaccion } from './db';
import { ahoraISO } from './reloj';
import {
  exigirExista, exigirGrupoActivo, fallar, notificarAlGrupo, responder,
} from './soporte';

/** Documentos del grupo, el más reciente primero. Disponibles también si está INACTIVO. */
export const listarPorGrupo = (grupoId) =>
  responder(
    listar('documentos')
      .filter((documento) => documento.grupoId === grupoId)
      .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn)),
  );

export const obtener = (documentoId) => {
  const documento = porId('documentos', documentoId);
  if (!documento) return fallar(ERRORES.NO_ENCONTRADO, 'El documento no existe.');
  return responder(documento);
};

/** Versión vigente del documento, que es la que se descarga por defecto. */
export const versionVigente = (documento) =>
  documento?.versiones?.find((version) => version.numero === documento.versionVigente) ?? null;

/**
 * §5.19 y RF-14. Publica un documento informativo o una solicitud con entrega.
 * Si requiere entrega, crea de inmediato una entrega PENDIENTE por cada estudiante
 * vinculado: la solicitud es común, el seguimiento es individual.
 */
export const crear = ({ grupoId, nombre, instrucciones, tipo, archivo }) => {
  const nombreLimpio = String(nombre ?? '').trim();
  const instruccionesLimpias = String(instrucciones ?? '').trim();

  if (!nombreLimpio) {
    return fallar(ERRORES.NO_AUTORIZADO, 'Indica el nombre del documento.');
  }
  if (!Object.values(TIPO_DOCUMENTO).includes(tipo)) {
    return fallar(ERRORES.NO_AUTORIZADO, 'Indica si el documento es informativo o requiere entrega.');
  }
  if (!archivo) {
    return fallar(ERRORES.ARCHIVO_INVALIDO, 'Adjunta el archivo principal del documento.');
  }

  try {
    const documento = transaccion((datos) => {
      const grupo = exigirGrupoActivo(
        datos.grupos.find((candidato) => candidato.id === grupoId),
      );

      const ahoraTexto = ahoraISO();
      const nuevo = {
        id: nuevoId('doc'),
        grupoId,
        nombre: nombreLimpio,
        instrucciones: instruccionesLimpias,
        tipo,
        versionVigente: 1,
        versiones: [{ numero: 1, archivo, publicadaEn: ahoraTexto }],
        creadoEn: ahoraTexto,
      };
      datos.documentos.push(nuevo);

      if (tipo === TIPO_DOCUMENTO.REQUIERE_ENTREGA) {
        datos.vinculaciones
          .filter((vinculacion) => vinculacion.grupoId === grupoId)
          .forEach((vinculacion) => {
            datos.entregas.push({
              id: nuevoId('ent'),
              documentoId: nuevo.id,
              vinculacionId: vinculacion.id,
              estudianteId: vinculacion.estudianteId,
              estado: ESTADO_ENTREGA.PENDIENTE,
              comentarioCorreccion: null,
              versionDocumentoUsada: 1,
              versiones: [],
            });
          });
      }

      notificarAlGrupo(datos, {
        grupo,
        tipo: TIPO_NOTIFICACION.DOCUMENTO_PUBLICADO,
        mensaje: `Se publicó «${nombreLimpio}».`,
        referencia: { tipo: TIPO_REFERENCIA.DOCUMENTO, id: nuevo.id },
      });

      return nuevo;
    });

    return responder(documento);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * §5.23 y RN-20. Cambia el archivo publicado: crea una versión nueva, conserva la
 * anterior y notifica al grupo. Las entregas existentes no se eliminan ni se reabren;
 * mantienen la versión que usaron.
 */
export const cambiarArchivo = (documentoId, archivo) => {
  if (!archivo) {
    return fallar(ERRORES.ARCHIVO_INVALIDO, 'Selecciona el archivo nuevo.');
  }

  try {
    const documento = transaccion((datos) => {
      const encontrado = exigirExista(
        datos.documentos.find((candidato) => candidato.id === documentoId),
        'El documento no existe.',
      );
      const grupo = exigirGrupoActivo(
        datos.grupos.find((candidato) => candidato.id === encontrado.grupoId),
      );

      const numero = encontrado.versiones.length + 1;
      encontrado.versiones.push({ numero, archivo, publicadaEn: ahoraISO() });
      encontrado.versionVigente = numero;

      notificarAlGrupo(datos, {
        grupo,
        tipo: TIPO_NOTIFICACION.DOCUMENTO_ACTUALIZADO,
        mensaje: `Se publicó la versión ${numero} de «${encontrado.nombre}».`,
        referencia: { tipo: TIPO_REFERENCIA.DOCUMENTO, id: encontrado.id },
      });

      return encontrado;
    });

    return responder(documento);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * La tarjeta de §5.18: el archivo común más una fila por estudiante con su entrega.
 * Los documentos informativos no llevan filas individuales.
 */
export const tarjetaDocente = (documentoId) => {
  const documento = porId('documentos', documentoId);
  if (!documento) return fallar(ERRORES.NO_ENCONTRADO, 'El documento no existe.');

  if (documento.tipo === TIPO_DOCUMENTO.INFORMATIVO) {
    return responder({ documento, entregas: [] });
  }

  const usuarios = listar('usuarios');
  const entregas = listar('entregas')
    .filter((entrega) => entrega.documentoId === documentoId)
    .map((entrega) => ({
      ...entrega,
      estudianteNombre: usuarios.find((u) => u.id === entrega.estudianteId)?.nombre ?? '',
      versionVigente: entrega.versiones.length,
      ultimoEnvio: entrega.versiones.at(-1)?.enviadaEn ?? null,
    }))
    .sort((a, b) => a.estudianteNombre.localeCompare(b.estudianteNombre, 'es'));

  return responder({ documento, entregas });
};

/**
 * Todos los documentos del grupo con sus entregas ya resueltas (§5.18).
 *
 * Existe para no pedir el detalle documento a documento: la pantalla necesita las filas
 * de estudiante de todas las tarjetas a la vez, y con una consulta por documento haría
 * N+1 peticiones contra el backend futuro. El contrato real devuelve esto de una vez.
 */
export const listarConEntregas = (grupoId) => {
  const usuarios = listar('usuarios');
  const entregas = listar('entregas');
  const vinculaciones = listar('vinculaciones').filter((v) => v.grupoId === grupoId);

  const tarjetas = listar('documentos')
    .filter((documento) => documento.grupoId === grupoId)
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn))
    .map((documento) => {
      if (documento.tipo === TIPO_DOCUMENTO.INFORMATIVO) {
        return { documento, entregas: [] };
      }

      /*
       * §5.21: quien se vincule después también accede a las publicaciones vigentes. Si
       * una vinculación no tiene fila de entrega —porque se creó antes de que existiera
       * ese mecanismo— se deriva una Pendiente en lugar de dejarla fuera de la tarjeta.
       */
      const filas = vinculaciones.map((vinculacion) => {
        const propia = entregas.find((entrega) => entrega.documentoId === documento.id
          && entrega.vinculacionId === vinculacion.id);

        const base = propia ?? {
          id: null,
          documentoId: documento.id,
          vinculacionId: vinculacion.id,
          estudianteId: vinculacion.estudianteId,
          estado: ESTADO_ENTREGA.PENDIENTE,
          comentarioCorreccion: null,
          versionDocumentoUsada: documento.versionVigente,
          versiones: [],
        };

        return {
          ...base,
          estudianteNombre: usuarios.find((u) => u.id === base.estudianteId)?.nombre ?? '',
          versionVigente: base.versiones.length,
          ultimoEnvio: base.versiones.at(-1)?.enviadaEn ?? null,
        };
      }).sort((a, b) => a.estudianteNombre.localeCompare(b.estudianteNombre, 'es'));

      return { documento, entregas: filas };
    });

  return responder(tarjetas);
};

/**
 * Los documentos del grupo con **solo la entrega propia** del estudiante (§4.11, RN-17).
 *
 * La diferencia con `listarConEntregas` no es cosmética: ahí el docente ve la fila de
 * cada estudiante, y aquí cada estudiante ve únicamente la suya. RN-17 limita su acceso a
 * «sus propias jornadas, evidencias, entregas, versiones, correcciones y notificaciones»,
 * así que el servicio no devuelve las de los demás en lugar de confiar en que la pantalla
 * no las pinte.
 *
 * §5.21: si la vinculación no tiene fila —porque se vinculó después de la publicación— se
 * deriva una `Pendiente`, igual que en la vista del docente.
 */
export const listarParaEstudiante = (grupoId, estudianteId) => {
  const entregas = listar('entregas');

  const tarjetas = listar('documentos')
    .filter((documento) => documento.grupoId === grupoId)
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn))
    .map((documento) => {
      if (documento.tipo === TIPO_DOCUMENTO.INFORMATIVO) {
        return { documento, entrega: null };
      }

      const propia = entregas.find((entrega) => entrega.documentoId === documento.id
        && entrega.estudianteId === estudianteId);

      return {
        documento,
        entrega: propia ?? {
          id: null,
          documentoId: documento.id,
          vinculacionId: null,
          estudianteId,
          estado: ESTADO_ENTREGA.PENDIENTE,
          comentarioCorreccion: null,
          versionDocumentoUsada: documento.versionVigente,
          versiones: [],
        },
      };
    });

  return responder(tarjetas);
};

export const documentoMock = {
  listarPorGrupo,
  listarConEntregas,
  listarParaEstudiante,
  obtener,
  versionVigente,
  crear,
  cambiarArchivo,
  tarjetaDocente,
};
