/**
 * Vinculación del estudiante por código (RF-05, RF-06, RN-05, §4.2 a §4.4, §4.16).
 *
 * RN-05: un estudiante puede mantener dos o más prácticas activas a la vez, pero solo
 *        una vinculación por grupo, y el código debe estar ACTIVO al vincular.
 * §4.16: si el código no existe, está inactivo o ya corresponde a una práctica suya, la
 *        vinculación no se crea y las existentes no se alteran.
 */

import {
  ERRORES,
  ESTADO_ENTREGA,
  ESTADO_GRUPO,
  ESTADO_SOLICITUD,
  TIPO_DOCUMENTO,
} from '../../utils/constants';
import { anioDelGrupo } from '../../utils/fechas';
import { avanceMeta } from '../../utils/horas';
import { listar, nuevoId, porId, transaccion } from './db';
import { ahoraISO } from './reloj';
import { ErrorServicio, exigirExista, fallar, responder } from './soporte';

const normalizarCodigo = (codigo) => String(codigo ?? '').trim().toUpperCase();

/**
 * RF-05: todas las prácticas del estudiante, activas e inactivas, con lo que la tabla
 * del Dashboard necesita mostrar sin pedir nada más.
 */
export const listarDelEstudiante = (estudianteId) => {
  const grupos = listar('grupos');
  const jornadas = listar('jornadas');

  const practicas = listar('vinculaciones')
    .filter((vinculacion) => vinculacion.estudianteId === estudianteId)
    .map((vinculacion) => {
      const grupo = grupos.find((g) => g.id === vinculacion.grupoId);
      const suyas = jornadas.filter((j) => j.vinculacionId === vinculacion.id);
      const horas = suyas.reduce((total, j) => total + (j.horas ?? 0), 0);

      return {
        vinculacionId: vinculacion.id,
        vinculadoEn: vinculacion.vinculadoEn,
        grupoId: grupo.id,
        nombre: grupo.nombre,
        descripcion: grupo.descripcion,
        codigo: grupo.codigo,
        estado: grupo.estado,
        docenteNombre: grupo.docenteNombre,
        metaMinimaHoras: grupo.metaMinimaHoras,
        anio: anioDelGrupo(grupo.creadoEn),
        totalJornadas: suyas.length,
        ...avanceMeta(Math.round(horas * 100) / 100, grupo.metaMinimaHoras),
        solicitudesPendientes: suyas
          .filter((j) => j.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE).length,
      };
    })
    .sort((a, b) => {
      // Activas primero; dentro de cada grupo, la vinculación más reciente arriba.
      if (a.estado !== b.estado) return a.estado === ESTADO_GRUPO.ACTIVO ? -1 : 1;
      return new Date(b.vinculadoEn) - new Date(a.vinculadoEn);
    });

  return responder(practicas);
};

export const obtener = (vinculacionId) => {
  const vinculacion = porId('vinculaciones', vinculacionId);
  if (!vinculacion) return fallar(ERRORES.NO_ENCONTRADO, 'La vinculación no existe.');
  return responder(vinculacion);
};

/** La vinculación de un estudiante con un grupo, si existe. */
export const deEstudianteEnGrupo = (estudianteId, grupoId) =>
  responder(
    listar('vinculaciones').find((vinculacion) => vinculacion.estudianteId === estudianteId
      && vinculacion.grupoId === grupoId) ?? null,
  );

/** Comprueba el código y aplica las tres reglas de §4.16. Lanza, no devuelve. */
const validarCodigo = (datos, codigo, estudianteId) => {
  const buscado = normalizarCodigo(codigo);

  if (!buscado) {
    throw new ErrorServicio(ERRORES.CODIGO_INEXISTENTE, 'Ingresa un código de vinculación.');
  }

  const grupo = datos.grupos.find((candidato) => candidato.codigo === buscado);
  if (!grupo) {
    throw new ErrorServicio(
      ERRORES.CODIGO_INEXISTENTE,
      'El código no corresponde a ningún grupo. Revísalo y vuelve a intentarlo.',
    );
  }

  if (grupo.estado !== ESTADO_GRUPO.ACTIVO) {
    throw new ErrorServicio(
      ERRORES.GRUPO_INACTIVO,
      'El código está inactivo y no admite nuevas vinculaciones.',
    );
  }

  const yaVinculado = datos.vinculaciones.some(
    (vinculacion) => vinculacion.grupoId === grupo.id
      && vinculacion.estudianteId === estudianteId,
  );
  if (yaVinculado) {
    throw new ErrorServicio(
      ERRORES.YA_VINCULADO,
      'Ya estás vinculado a esta práctica. Ingresa a ella desde tu panel.',
    );
  }

  return grupo;
};

/**
 * §4.3: vista previa antes de confirmar. Muestra los datos del grupo sin crear nada.
 * Valida lo mismo que `vincular` para que el error aparezca antes de confirmar.
 */
export const previsualizarCodigo = (codigo, estudianteId) => {
  try {
    const datos = {
      grupos: listar('grupos'),
      vinculaciones: listar('vinculaciones'),
    };
    const grupo = validarCodigo(datos, codigo, estudianteId);

    return responder({
      grupoId: grupo.id,
      nombre: grupo.nombre,
      descripcion: grupo.descripcion,
      codigo: grupo.codigo,
      docenteNombre: grupo.docenteNombre,
      metaMinimaHoras: grupo.metaMinimaHoras,
      estado: grupo.estado,
      anio: anioDelGrupo(grupo.creadoEn),
    });
  } catch (error) {
    return fallar(error.codigo, error.mensaje);
  }
};

/** RF-06: crea la vinculación después de la confirmación del estudiante. */
export const vincular = (codigo, estudianteId) => {
  try {
    const resultado = transaccion((datos) => {
      exigirExista(
        datos.usuarios.find((usuario) => usuario.id === estudianteId),
        'El estudiante no existe.',
      );
      const grupo = validarCodigo(datos, codigo, estudianteId);

      const vinculacion = {
        id: nuevoId('vin'),
        grupoId: grupo.id,
        estudianteId,
        vinculadoEn: ahoraISO(),
      };
      datos.vinculaciones.push(vinculacion);

      // §5.21: quien se vincula después también accede a las publicaciones vigentes.
      // Una solicitud documental le crea su propia entrega, en PENDIENTE.
      datos.documentos
        .filter((documento) => documento.grupoId === grupo.id
          && documento.tipo === TIPO_DOCUMENTO.REQUIERE_ENTREGA)
        .forEach((documento) => {
          datos.entregas.push({
            id: nuevoId('ent'),
            documentoId: documento.id,
            vinculacionId: vinculacion.id,
            estudianteId,
            estado: ESTADO_ENTREGA.PENDIENTE,
            comentarioCorreccion: null,
            versionDocumentoUsada: documento.versionVigente,
            versiones: [],
          });
        });

      return { vinculacion, grupo };
    });

    return responder(resultado);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * Ficha de *Mi práctica* (decisión A-04): los seis campos que §4.3 define para
 * identificar un grupo, más los datos de la vinculación. Siempre de solo lectura.
 */
export const fichaDePractica = (vinculacionId) => {
  const vinculacion = porId('vinculaciones', vinculacionId);
  if (!vinculacion) return fallar(ERRORES.NO_ENCONTRADO, 'La vinculación no existe.');

  const grupo = porId('grupos', vinculacion.grupoId);
  const jornadas = listar('jornadas').filter((j) => j.vinculacionId === vinculacionId);
  const horas = jornadas.reduce((total, j) => total + (j.horas ?? 0), 0);

  return responder({
    nombre: grupo.nombre,
    descripcion: grupo.descripcion,
    codigo: grupo.codigo,
    docenteNombre: grupo.docenteNombre,
    metaMinimaHoras: grupo.metaMinimaHoras,
    estado: grupo.estado,
    anio: anioDelGrupo(grupo.creadoEn),
    vinculadoEn: vinculacion.vinculadoEn,
    totalJornadas: jornadas.length,
    ...avanceMeta(Math.round(horas * 100) / 100, grupo.metaMinimaHoras),
  });
};

export const vinculacionMock = {
  listarDelEstudiante,
  obtener,
  deEstudianteEnGrupo,
  previsualizarCodigo,
  vincular,
  fichaDePractica,
};
