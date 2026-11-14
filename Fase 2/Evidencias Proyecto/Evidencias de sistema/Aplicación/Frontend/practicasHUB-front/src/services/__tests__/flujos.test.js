import { beforeEach, describe, expect, it } from 'vitest';
import { reiniciar } from '../mock/db';
import { avanzar, reiniciarReloj } from '../mock/reloj';
import { grupoMock } from '../mock/grupo.mock';
import { vinculacionMock } from '../mock/vinculacion.mock';
import { jornadaMock } from '../mock/jornada.mock';
import { solicitudMock } from '../mock/solicitud.mock';
import { entregaMock } from '../mock/entrega.mock';
import { documentoMock } from '../mock/documento.mock';
import { notificacionMock } from '../mock/notificacion.mock';
import {
  ERRORES,
  ESTADO_ENTREGA,
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  TIPO_DOCUMENTO,
  TIPO_NOTIFICACION,
} from '../../utils/constants';

/**
 * Recorre los flujos de negocio contra el almacén simulado.
 *
 * No prueba la implementación del mock: prueba las REGLAS. Cuando llegue el backend de
 * Spring Boot, estas mismas expectativas son las que tiene que cumplir, y por eso están
 * escritas contra los servicios y no contra las funciones internas.
 *
 * El reloj inyectable permite cerrar la ventana de 24 h en un milisegundo.
 */

const GRUPO_ACTIVO = 'gru_1';
const GRUPO_INACTIVO = 'gru_3';
const VIN_EST1_G1 = 'vin_1';
const VIN_EST1_G2 = 'vin_2';
const EST1 = 'est_1';
const DOC1 = 'doc_1';

/** Captura el error `{ codigo, mensaje }` de una promesa que debe fallar. */
const errorDe = async (promesa) => {
  try {
    await promesa;
    throw new Error('Se esperaba un fallo y la operación tuvo éxito.');
  } catch (error) {
    return error;
  }
};

const jornadaBase = (fecha) => ({
  fecha,
  horaInicio: '09:00',
  horaTermino: '18:00',
  descansoMin: 60,
  actividadPrincipal: 'Desarrollo de funcionalidades',
});

beforeEach(() => {
  reiniciarReloj();
  reiniciar();
});

describe('registro de jornadas (RF-07, RF-08)', () => {
  it('calcula las horas y deja la jornada REGISTRADA', async () => {
    const [jornada] = await jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2026-01-15'));

    // 09:00 a 18:00 son 9 h, menos 60 min de descanso: 8 (RN-07).
    expect(jornada.horas).toBe(8);
    expect(jornada.estado).toBe(ESTADO_JORNADA.REGISTRADA);
    expect(jornada.solicitud).toBeNull();
  });

  it('ignora unas horas enviadas desde fuera: las calcula el sistema (RN-07)', async () => {
    const [jornada] = await jornadaMock.registrar(VIN_EST1_G1, {
      ...jornadaBase('2026-01-16'),
      horas: 99,
    });
    expect(jornada.horas).toBe(8);
  });

  it('la descripción es opcional (RF-07)', async () => {
    const [jornada] = await jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2026-01-17'));
    expect(jornada.descripcion).toBeNull();
  });

  it('rechaza una fecha ya usada en la misma práctica (RN-09)', async () => {
    await jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2026-02-10'));
    const error = await errorDe(
      jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2026-02-10')),
    );
    expect(error.codigo).toBe(ERRORES.FECHA_REPETIDA);
  });

  it('acepta la misma fecha en otra práctica (RN-09)', async () => {
    await jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2026-02-11'));
    const [otra] = await jornadaMock.registrar(VIN_EST1_G2, jornadaBase('2026-02-11'));
    expect(otra.fecha).toBe('2026-02-11');
  });

  it('rechaza dos jornadas con la misma fecha en una sola tanda (§4.17)', async () => {
    const error = await errorDe(jornadaMock.registrar(VIN_EST1_G1, [
      jornadaBase('2026-03-01'),
      jornadaBase('2026-03-01'),
    ]));
    expect(error.codigo).toBe(ERRORES.FECHA_REPETIDA);
  });

  it('si una jornada de la tanda falla, no se guarda ninguna', async () => {
    const antes = await jornadaMock.listarPorVinculacion(VIN_EST1_G1);
    await errorDe(jornadaMock.registrar(VIN_EST1_G1, [
      jornadaBase('2026-03-05'),
      { ...jornadaBase('2026-03-06'), horaTermino: '08:00' },
    ]));
    const despues = await jornadaMock.listarPorVinculacion(VIN_EST1_G1);
    expect(despues).toHaveLength(antes.length);
  });

  it('rechaza horarios imposibles (RN-08)', async () => {
    const error = await errorDe(jornadaMock.registrar(VIN_EST1_G1, {
      ...jornadaBase('2026-03-10'),
      horaInicio: '18:00',
      horaTermino: '09:00',
    }));
    expect(error.codigo).toBe(ERRORES.HORARIO_INVALIDO);
  });

  it('acepta una jornada larga: no hay tope diario (RN-15)', async () => {
    const [jornada] = await jornadaMock.registrar(VIN_EST1_G1, {
      ...jornadaBase('2026-03-11'),
      horaInicio: '06:00',
      horaTermino: '20:00',
      descansoMin: 0,
    });
    expect(jornada.horas).toBe(14);
  });

  it('acepta una fecha futura: solo se valida RN-09 (decisión A-12)', async () => {
    const [jornada] = await jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2099-12-31'));
    expect(jornada.fecha).toBe('2099-12-31');
  });

  it('no deja registrar en un grupo inactivo (RN-03)', async () => {
    const error = await errorDe(
      jornadaMock.registrar('vin_5', jornadaBase('2026-04-01')),
    );
    expect(error.codigo).toBe(ERRORES.GRUPO_INACTIVO);
  });
});

describe('ventana de 24 horas (RN-11)', () => {
  it('se puede editar justo después de registrar, y la fecha no cambia', async () => {
    const [creada] = await jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2026-05-02'));

    const editada = await jornadaMock.editarDirecto(creada.id, {
      horaTermino: '19:00',
      fecha: '2026-05-03',
      actividadPrincipal: 'Actividad corregida',
    });

    expect(editada.horas).toBe(9);
    expect(editada.actividadPrincipal).toBe('Actividad corregida');
    // La fecha enviada se ignora en silencio: nunca se modifica (A-06).
    expect(editada.fecha).toBe('2026-05-02');
  });

  it('pasadas 25 horas la edición directa falla', async () => {
    const [creada] = await jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2026-05-04'));

    avanzar(25 * 3600);

    const error = await errorDe(jornadaMock.editarDirecto(creada.id, { horaTermino: '19:00' }));
    expect(error.codigo).toBe(ERRORES.PLAZO_VENCIDO);
  });

  it('a las 23 h 59 min todavía se puede editar', async () => {
    const [creada] = await jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2026-05-05'));

    avanzar(24 * 3600 - 60);

    const editada = await jornadaMock.editarDirecto(creada.id, { descansoMin: 30 });
    expect(editada.horas).toBe(8.5);
  });
});

describe('flujo de corrección (RN-12, RN-13)', () => {
  /** Deja una jornada registrada y con el plazo ya vencido. */
  const jornadaVencida = async (fecha) => {
    const [creada] = await jornadaMock.registrar(VIN_EST1_G1, jornadaBase(fecha));
    avanzar(30 * 3600);
    return creada;
  };

  it('no se puede solicitar mientras el plazo sigue abierto', async () => {
    const [creada] = await jornadaMock.registrar(VIN_EST1_G1, jornadaBase('2026-06-01'));
    const error = await errorDe(solicitudMock.crear(creada.id, 'Me equivoqué en la hora de término.'));
    expect(error.codigo).toBe(ERRORES.SOLICITUD_EN_CURSO);
  });

  it('exige un motivo con sustancia', async () => {
    const creada = await jornadaVencida('2026-06-02');
    const error = await errorDe(solicitudMock.crear(creada.id, 'ups'));
    expect(error.mensaje).toMatch(/motivo/i);
  });

  it('la jornada sigue REGISTRADA y bloqueada mientras la solicitud está PENDIENTE', async () => {
    const creada = await jornadaVencida('2026-06-03');
    const conSolicitud = await solicitudMock.crear(creada.id, 'Registré mal la hora de término.');

    expect(conSolicitud.estado).toBe(ESTADO_JORNADA.REGISTRADA);
    expect(conSolicitud.solicitud.estado).toBe(ESTADO_SOLICITUD.PENDIENTE);
  });

  it('avisa al docente al enviarla', async () => {
    const creada = await jornadaVencida('2026-06-04');
    await solicitudMock.crear(creada.id, 'Registré mal la hora de término.');

    const avisos = await notificacionMock.generales(DOC1);
    expect(avisos[0].tipo).toBe(TIPO_NOTIFICACION.SOLICITUD_ENVIADA);
    // RN-16: toda notificación identifica el grupo de origen.
    expect(avisos[0].grupoCodigo).toBeTruthy();
  });

  it('habilitar exige observación y deja la jornada OBSERVADA', async () => {
    const creada = await jornadaVencida('2026-06-05');
    await solicitudMock.crear(creada.id, 'Registré mal la hora de término.');

    const sinObservacion = await errorDe(solicitudMock.habilitar(creada.id, '   '));
    expect(sinObservacion.mensaje).toMatch(/observación/i);

    const observada = await solicitudMock.habilitar(creada.id, 'Autorizado, corrige la hora.');
    expect(observada.estado).toBe(ESTADO_JORNADA.OBSERVADA);
    expect(observada.solicitud.estado).toBe(ESTADO_SOLICITUD.HABILITADA);
  });

  it('guardar la corrección devuelve la jornada a REGISTRADA y cierra la solicitud', async () => {
    const creada = await jornadaVencida('2026-06-06');
    await solicitudMock.crear(creada.id, 'Registré mal la hora de término.');
    await solicitudMock.habilitar(creada.id, 'Autorizado.');

    const corregida = await jornadaMock.guardarCorreccion(creada.id, { horaTermino: '19:00' });

    expect(corregida.estado).toBe(ESTADO_JORNADA.REGISTRADA);
    expect(corregida.solicitud.estado).toBe(ESTADO_SOLICITUD.COMPLETADA);
    expect(corregida.horas).toBe(9);
  });

  it('la corrección también respeta la fecha bloqueada', async () => {
    const creada = await jornadaVencida('2026-06-07');
    await solicitudMock.crear(creada.id, 'Registré mal la hora de término.');
    await solicitudMock.habilitar(creada.id, 'Autorizado.');

    const corregida = await jornadaMock.guardarCorreccion(creada.id, {
      fecha: '2026-06-08',
      descansoMin: 30,
    });
    expect(corregida.fecha).toBe('2026-06-07');
  });

  it('no se puede guardar una corrección que nadie habilitó', async () => {
    const creada = await jornadaVencida('2026-06-09');
    const error = await errorDe(jornadaMock.guardarCorreccion(creada.id, { descansoMin: 0 }));
    expect(error.codigo).toBe(ERRORES.NO_AUTORIZADO);
  });

  it('rechazar exige comentario y NO habilita la edición (§4.10)', async () => {
    const creada = await jornadaVencida('2026-06-10');
    await solicitudMock.crear(creada.id, 'Quiero cambiar la fecha.');

    const sinComentario = await errorDe(solicitudMock.rechazar(creada.id, ''));
    expect(sinComentario.mensaje).toMatch(/motivo del rechazo/i);

    const rechazada = await solicitudMock.rechazar(creada.id, 'La fecha no se modifica.');
    expect(rechazada.estado).toBe(ESTADO_JORNADA.REGISTRADA);
    expect(rechazada.solicitud.estado).toBe(ESTADO_SOLICITUD.RECHAZADA);

    const error = await errorDe(jornadaMock.guardarCorreccion(creada.id, { descansoMin: 0 }));
    expect(error.codigo).toBe(ERRORES.NO_AUTORIZADO);
  });

  it('tras un rechazo se puede volver a solicitar (decisión A-09)', async () => {
    const creada = await jornadaVencida('2026-06-11');
    await solicitudMock.crear(creada.id, 'Primer intento de corrección.');
    await solicitudMock.rechazar(creada.id, 'Explícalo mejor.');

    const segunda = await solicitudMock.crear(creada.id, 'Segundo intento, con más detalle.');
    expect(segunda.solicitud.estado).toBe(ESTADO_SOLICITUD.PENDIENTE);

    // Y la rechazada no se pierde: queda en el historial (RNF-09).
    const historial = await solicitudMock.historialDeJornada(creada.id);
    expect(historial.map((s) => s.estado)).toContain(ESTADO_SOLICITUD.RECHAZADA);
  });

  it('un docente ajeno no puede resolver la solicitud (RN-18)', async () => {
    const creada = await jornadaVencida('2026-06-12');
    await solicitudMock.crear(creada.id, 'Registré mal la hora de término.');

    const error = await errorDe(solicitudMock.habilitar(creada.id, 'Autorizado.', 'doc_2'));
    expect(error.codigo).toBe(ERRORES.NO_AUTORIZADO);
  });
});

describe('grupos y códigos (RF-03, RN-01 a RN-03)', () => {
  it('crea el grupo con un código único y ACTIVO, que el docente no escribe', async () => {
    const grupo = await grupoMock.crear({
      docenteId: DOC1,
      nombre: 'Práctica Laboral 2027',
      descripcion: 'Grupo nuevo de prueba.',
      metaMinimaHoras: 400,
    });

    expect(grupo.codigo).toMatch(/^PRA-\d{4}-[A-Z2-9]{4}$/);
    expect(grupo.estado).toBe(ESTADO_GRUPO.ACTIVO);
    expect(grupo.anio).toBeTypeOf('number');

    const todos = await grupoMock.listarDelDocente(DOC1);
    const codigos = todos.map((g) => g.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('exige nombre, descripción y meta (RN-01)', async () => {
    const sinNombre = await errorDe(grupoMock.crear({
      docenteId: DOC1, nombre: '  ', descripcion: 'x', metaMinimaHoras: 100,
    }));
    expect(sinNombre.mensaje).toMatch(/nombre/i);

    const sinMeta = await errorDe(grupoMock.crear({
      docenteId: DOC1, nombre: 'Grupo', descripcion: 'x', metaMinimaHoras: 0,
    }));
    expect(sinMeta.mensaje).toMatch(/meta/i);
  });

  it('desactivar conserva el código y el historial; reactivar lo recupera (RN-03)', async () => {
    const antes = await grupoMock.obtener(GRUPO_ACTIVO);
    const jornadasAntes = await jornadaMock.listarDeEstudianteEnGrupo(EST1, GRUPO_ACTIVO);

    const desactivado = await grupoMock.desactivar(GRUPO_ACTIVO);
    expect(desactivado.estado).toBe(ESTADO_GRUPO.INACTIVO);
    expect(desactivado.codigo).toBe(antes.codigo);

    const jornadasDespues = await jornadaMock.listarDeEstudianteEnGrupo(EST1, GRUPO_ACTIVO);
    expect(jornadasDespues).toHaveLength(jornadasAntes.length);
    expect(desactivado.totalEstudiantes).toBe(antes.totalEstudiantes);

    const reactivado = await grupoMock.reactivar(GRUPO_ACTIVO);
    expect(reactivado.estado).toBe(ESTADO_GRUPO.ACTIVO);
    // No existe regeneración de códigos.
    expect(reactivado.codigo).toBe(antes.codigo);
  });

  it('el resumen docente trae los cuatro indicadores de §5.4', async () => {
    const resumen = await grupoMock.resumen(GRUPO_ACTIVO);
    expect(Object.keys(resumen).sort()).toEqual([
      'entregasNuevas', 'estudiantesVinculados', 'metaMinimaHoras', 'solicitudesPendientes',
    ]);
    expect(resumen.estudiantesVinculados).toBe(3);
  });

  it('el padrón trae a los estudiantes con sus horas (decisión A-03)', async () => {
    const padron = await grupoMock.estudiantesDelGrupo(GRUPO_ACTIVO);
    expect(padron).toHaveLength(3);
    expect(padron[0]).toHaveProperty('vinculadoEn');
    expect(padron[0]).toHaveProperty('registradas');
    expect(padron[0]).toHaveProperty('solicitudesPendientes');
  });
});

describe('vinculación por código (RF-06, RN-05, §4.16)', () => {
  it('rechaza un código inexistente', async () => {
    const error = await errorDe(vinculacionMock.vincular('NO-EXISTE', 'est_4'));
    expect(error.codigo).toBe(ERRORES.CODIGO_INEXISTENTE);
  });

  it('rechaza un código inactivo', async () => {
    const inactivo = await grupoMock.obtener(GRUPO_INACTIVO);
    const error = await errorDe(vinculacionMock.vincular(inactivo.codigo, EST1));
    expect(error.codigo).toBe(ERRORES.GRUPO_INACTIVO);
  });

  it('rechaza vincularse dos veces al mismo grupo', async () => {
    const grupo = await grupoMock.obtener(GRUPO_ACTIVO);
    const error = await errorDe(vinculacionMock.vincular(grupo.codigo, EST1));
    expect(error.codigo).toBe(ERRORES.YA_VINCULADO);
  });

  it('un error de código no altera las vinculaciones existentes (§4.16)', async () => {
    const antes = await vinculacionMock.listarDelEstudiante(EST1);
    await errorDe(vinculacionMock.vincular('NO-EXISTE', EST1));
    const despues = await vinculacionMock.listarDelEstudiante(EST1);
    expect(despues).toHaveLength(antes.length);
  });

  it('un estudiante puede mantener varias prácticas activas (RN-05)', async () => {
    const practicas = await vinculacionMock.listarDelEstudiante(EST1);
    const activas = practicas.filter((p) => p.estado === ESTADO_GRUPO.ACTIVO);
    expect(activas.length).toBeGreaterThanOrEqual(2);
  });

  it('al vincularse se reciben las solicitudes documentales vigentes (§5.21)', async () => {
    const grupo = await grupoMock.obtener(GRUPO_ACTIVO);
    const { vinculacion } = await vinculacionMock.vincular(grupo.codigo, 'est_4');

    const suyas = await entregaMock.deEstudiante('doc_ent_1', 'est_4');
    expect(suyas).not.toBeNull();
    expect(suyas.estado).toBe(ESTADO_ENTREGA.PENDIENTE);
    expect(suyas.vinculacionId).toBe(vinculacion.id);
  });

  it('la vista previa valida sin crear nada (§4.3)', async () => {
    const grupo = await grupoMock.obtener(GRUPO_ACTIVO);
    const antes = await vinculacionMock.listarDelEstudiante('est_4');

    const ficha = await vinculacionMock.previsualizarCodigo(grupo.codigo, 'est_4');
    expect(ficha.docenteNombre).toBeTruthy();
    expect(ficha.metaMinimaHoras).toBe(grupo.metaMinimaHoras);

    const despues = await vinculacionMock.listarDelEstudiante('est_4');
    expect(despues).toHaveLength(antes.length);
  });
});

describe('documentos y entregas (RF-14, RF-15, RN-20)', () => {
  it('publicar una solicitud crea una entrega PENDIENTE por estudiante (§5.19)', async () => {
    const documento = await documentoMock.crear({
      grupoId: GRUPO_ACTIVO,
      nombre: 'Autoevaluación final',
      instrucciones: 'Completa la pauta.',
      tipo: TIPO_DOCUMENTO.REQUIERE_ENTREGA,
      archivo: { id: 'arc_x', nombre: 'pauta.pdf', extension: 'pdf' },
    });

    const entregas = await entregaMock.listarPorDocumento(documento.id);
    expect(entregas).toHaveLength(3);
    expect(entregas.every((e) => e.estado === ESTADO_ENTREGA.PENDIENTE)).toBe(true);
  });

  it('cambiar el archivo crea una versión y conserva la anterior (RN-20, §5.23)', async () => {
    const antes = await documentoMock.obtener('doc_ent_1');
    const despues = await documentoMock.cambiarArchivo('doc_ent_1', {
      id: 'arc_y', nombre: 'plantilla-v3.docx', extension: 'docx',
    });

    expect(despues.versiones).toHaveLength(antes.versiones.length + 1);
    expect(despues.versionVigente).toBe(antes.versionVigente + 1);
    // La versión anterior sigue ahí.
    expect(despues.versiones[0]).toEqual(antes.versiones[0]);
  });

  it('cambiar el archivo no borra las entregas ya enviadas (§5.23)', async () => {
    const antes = await entregaMock.obtener('ent_1');
    await documentoMock.cambiarArchivo('doc_ent_1', {
      id: 'arc_z', nombre: 'plantilla-v3.docx', extension: 'docx',
    });
    const despues = await entregaMock.obtener('ent_1');

    expect(despues.estado).toBe(antes.estado);
    expect(despues.versiones).toHaveLength(antes.versiones.length);
  });

  it('una entrega ya enviada no se reemplaza sin permiso del docente (§4.13)', async () => {
    const error = await errorDe(entregaMock.enviar('ent_1', { id: 'a', nombre: 'otro.pdf' }));
    expect(error.codigo).toBe(ERRORES.NO_AUTORIZADO);
  });

  it('pedir corrección habilita el reemplazo, y el reemplazo versiona (A-02, RN-20)', async () => {
    const pedida = await entregaMock.solicitarCorreccion('ent_1', 'Falta la sección 3.');
    expect(pedida.estado).toBe(ESTADO_ENTREGA.CORRECCION_SOLICITADA);
    expect(pedida.comentarioCorreccion).toMatch(/sección 3/);

    const reenviada = await entregaMock.enviar('ent_1', { id: 'a', nombre: 'v3.docx' });
    expect(reenviada.estado).toBe(ESTADO_ENTREGA.ENTREGADO);
    expect(reenviada.versiones).toHaveLength(3);
    expect(reenviada.comentarioCorreccion).toBeNull();
  });

  it('pedir corrección exige comentario', async () => {
    const error = await errorDe(entregaMock.solicitarCorreccion('ent_1', '  '));
    expect(error.mensaje).toMatch(/corregir/i);
  });

  it('nadie entrega en nombre de otro (RN-17)', async () => {
    const error = await errorDe(
      entregaMock.enviar('ent_2', { id: 'a', nombre: 'x.pdf' }, EST1),
    );
    expect(error.codigo).toBe(ERRORES.NO_AUTORIZADO);
  });

  it('en un grupo inactivo no se publica nada (§5.26)', async () => {
    const error = await errorDe(documentoMock.crear({
      grupoId: GRUPO_INACTIVO,
      nombre: 'Documento nuevo',
      instrucciones: '',
      tipo: TIPO_DOCUMENTO.INFORMATIVO,
      archivo: { id: 'arc_q', nombre: 'x.pdf', extension: 'pdf' },
    }));
    expect(error.codigo).toBe(ERRORES.GRUPO_INACTIVO);
  });
});

describe('notificaciones en dos niveles (RF-12, RN-16)', () => {
  it('las generales reúnen todos los grupos del usuario', async () => {
    const avisos = await notificacionMock.generales(EST1);
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos.every((a) => a.destinatarioId === EST1)).toBe(true);
    expect(avisos.every((a) => a.grupoNombre && a.grupoCodigo)).toBe(true);
  });

  it('las del grupo solo traen las de ese código', async () => {
    const delGrupo = await notificacionMock.delGrupo(EST1, GRUPO_ACTIVO);
    expect(delGrupo.every((a) => a.grupoId === GRUPO_ACTIVO)).toBe(true);
  });

  it('vienen de la más reciente a la más antigua', async () => {
    const avisos = await notificacionMock.generales(EST1);
    const fechas = avisos.map((a) => new Date(a.creadaEn).getTime());
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  it('publicar un documento avisa a todos los vinculados (§5.21)', async () => {
    const antes = (await notificacionMock.generales('est_2')).length;
    await documentoMock.crear({
      grupoId: GRUPO_ACTIVO,
      nombre: 'Aviso general',
      instrucciones: '',
      tipo: TIPO_DOCUMENTO.INFORMATIVO,
      archivo: { id: 'arc_w', nombre: 'aviso.pdf', extension: 'pdf' },
    });
    const despues = (await notificacionMock.generales('est_2')).length;
    expect(despues).toBe(antes + 1);
  });
});

describe('privacidad (RN-17)', () => {
  it('el estudiante solo ve sus jornadas del grupo seleccionado', async () => {
    const jornadas = await jornadaMock.listarDeEstudianteEnGrupo(EST1, GRUPO_ACTIVO);
    expect(jornadas.every((j) => j.estudianteId === EST1)).toBe(true);
    expect(jornadas.every((j) => j.grupoId === GRUPO_ACTIVO)).toBe(true);
  });

  it('las jornadas de otra práctica no se mezclan', async () => {
    const g1 = await jornadaMock.listarDeEstudianteEnGrupo(EST1, GRUPO_ACTIVO);
    const g2 = await jornadaMock.listarDeEstudianteEnGrupo(EST1, 'gru_2');
    const ids = new Set(g1.map((j) => j.id));
    expect(g2.some((j) => ids.has(j.id))).toBe(false);
  });
});
