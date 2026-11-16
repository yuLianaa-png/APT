import { describe, expect, it } from 'vitest';
import { destinoDe, necesitaVinculacion } from '../rutasNotificacion';
import { ROLES, TIPO_NOTIFICACION, TIPO_REFERENCIA } from '../constants';

const aviso = (tipoReferencia, id = 'ref_1', grupoId = 'gru_1') => ({
  id: 'not_1',
  grupoId,
  grupoNombre: 'Práctica Laboral 2026',
  grupoCodigo: 'PRL-2026-A4F2',
  tipo: TIPO_NOTIFICACION.SOLICITUD_ENVIADA,
  mensaje: 'Mensaje de prueba',
  referencia: { tipo: tipoReferencia, id },
  creadaEn: '2026-11-13T10:00:00.000Z',
});

describe('destinoDe: el grupo siempre va en la ruta (RN-04, RN-16)', () => {
  it('cada perfil entra por su propio espacio', () => {
    expect(destinoDe(aviso(TIPO_REFERENCIA.JORNADA, 'jor_9'), ROLES.ESTUDIANTE))
      .toBe('/estudiante/grupos/gru_1/jornadas?jornada=jor_9');
    expect(destinoDe(aviso(TIPO_REFERENCIA.DOCUMENTO, 'doc_3'), ROLES.DOCENTE))
      .toBe('/docente/grupos/gru_1/documentos?documento=doc_3');
  });

  it('la ruta lleva el grupo de la notificación, no uno cualquiera', () => {
    const otro = aviso(TIPO_REFERENCIA.JORNADA, 'jor_9', 'gru_7');
    expect(destinoDe(otro, ROLES.ESTUDIANTE)).toContain('/grupos/gru_7/');
  });

  it('dos avisos de grupos distintos llevan a rutas distintas', () => {
    const a = destinoDe(aviso(TIPO_REFERENCIA.JORNADA, 'jor_1', 'gru_1'), ROLES.ESTUDIANTE);
    const b = destinoDe(aviso(TIPO_REFERENCIA.JORNADA, 'jor_1', 'gru_2'), ROLES.ESTUDIANTE);
    expect(a).not.toBe(b);
  });
});

describe('destinoDe: jornadas', () => {
  it('el estudiante va a su propio historial', () => {
    expect(destinoDe(aviso(TIPO_REFERENCIA.JORNADA, 'jor_4'), ROLES.ESTUDIANTE))
      .toBe('/estudiante/grupos/gru_1/jornadas?jornada=jor_4');
  });

  it('el docente va al historial de esa persona, con su vinculación (§5.7)', () => {
    expect(destinoDe(aviso(TIPO_REFERENCIA.JORNADA, 'jor_4'), ROLES.DOCENTE, { vinculacionId: 'vin_3' }))
      .toBe('/docente/grupos/gru_1/jornadas/vin_3?jornada=jor_4');
  });

  it('sin vinculación, el docente aterriza en el listado de estudiantes (§5.6)', () => {
    // Mejor el paso previo que una ruta rota.
    expect(destinoDe(aviso(TIPO_REFERENCIA.JORNADA, 'jor_4'), ROLES.DOCENTE))
      .toBe('/docente/grupos/gru_1/jornadas');
  });

  it('la jornada concreta viaja en la consulta, para poder destacarla', () => {
    expect(destinoDe(aviso(TIPO_REFERENCIA.JORNADA, 'jor_4'), ROLES.ESTUDIANTE))
      .toContain('?jornada=jor_4');
  });
});

describe('destinoDe: documentos y entregas', () => {
  it('ambos llevan a Documentos: la entrega es una fila de su documento (§5.18)', () => {
    expect(destinoDe(aviso(TIPO_REFERENCIA.DOCUMENTO, 'doc_1'), ROLES.ESTUDIANTE))
      .toBe('/estudiante/grupos/gru_1/documentos?documento=doc_1');
    expect(destinoDe(aviso(TIPO_REFERENCIA.ENTREGA, 'ent_1'), ROLES.ESTUDIANTE))
      .toBe('/estudiante/grupos/gru_1/documentos?entrega=ent_1');
  });

  it('se distinguen por el nombre del parámetro', () => {
    const doc = destinoDe(aviso(TIPO_REFERENCIA.DOCUMENTO, 'x'), ROLES.DOCENTE);
    const ent = destinoDe(aviso(TIPO_REFERENCIA.ENTREGA, 'x'), ROLES.DOCENTE);
    expect(doc).not.toBe(ent);
  });
});

describe('destinoDe: datos incompletos', () => {
  it('devuelve null en lugar de una ruta rota', () => {
    expect(destinoDe(null, ROLES.ESTUDIANTE)).toBeNull();
    expect(destinoDe({ grupoId: 'gru_1' }, ROLES.ESTUDIANTE)).toBeNull();
    expect(destinoDe({ referencia: { tipo: 'JORNADA', id: 'x' } }, ROLES.ESTUDIANTE)).toBeNull();
  });

  it('un tipo de referencia desconocido no inventa destino', () => {
    expect(destinoDe(aviso('CUALQUIER_COSA'), ROLES.ESTUDIANTE)).toBeNull();
  });
});

describe('necesitaVinculacion', () => {
  it('solo el docente, y solo para jornadas', () => {
    expect(necesitaVinculacion(aviso(TIPO_REFERENCIA.JORNADA), ROLES.DOCENTE)).toBe(true);
    expect(necesitaVinculacion(aviso(TIPO_REFERENCIA.JORNADA), ROLES.ESTUDIANTE)).toBe(false);
    expect(necesitaVinculacion(aviso(TIPO_REFERENCIA.DOCUMENTO), ROLES.DOCENTE)).toBe(false);
  });

  it('tolera una notificación incompleta', () => {
    expect(necesitaVinculacion(null, ROLES.DOCENTE)).toBe(false);
  });
});
