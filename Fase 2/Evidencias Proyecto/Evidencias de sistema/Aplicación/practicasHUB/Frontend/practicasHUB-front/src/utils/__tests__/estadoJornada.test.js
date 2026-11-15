import { describe, expect, it } from 'vitest';
import { accionesDisponibles, accionesDocente, camposEditables, resumenEstado } from '../estadoJornada';
import {
  CAMPOS_EDITABLES_JORNADA,
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  MOTIVOS_BLOQUEO,
} from '../constants';

const AHORA = new Date('2026-11-13T12:00:00.000Z');
const haceHoras = (horas) => new Date(AHORA.getTime() - horas * 3_600_000).toISOString();

const grupoActivo = { id: 'g', estado: ESTADO_GRUPO.ACTIVO };
const grupoInactivo = { id: 'g', estado: ESTADO_GRUPO.INACTIVO };

const jornada = (extras = {}) => ({
  id: 'j',
  estado: ESTADO_JORNADA.REGISTRADA,
  creadaEn: haceHoras(1),
  solicitud: null,
  ...extras,
});

describe('accionesDisponibles: dentro de las 24 h', () => {
  const acciones = accionesDisponibles(jornada(), grupoActivo, AHORA);

  it('se puede editar directamente', () => {
    expect(acciones.editar.habilitada).toBe(true);
  });

  it('no se puede solicitar corrección todavía, y se explica por qué', () => {
    expect(acciones.solicitar.habilitada).toBe(false);
    expect(acciones.solicitar.motivoBloqueo).toBe(MOTIVOS_BLOQUEO.DENTRO_DEL_PLAZO);
  });

  it('ver siempre está disponible', () => {
    expect(acciones.ver.habilitada).toBe(true);
  });
});

describe('accionesDisponibles: plazo vencido', () => {
  const acciones = accionesDisponibles(jornada({ creadaEn: haceHoras(30) }), grupoActivo, AHORA);

  it('la edición directa queda bloqueada con el motivo del plazo', () => {
    expect(acciones.editar.habilitada).toBe(false);
    expect(acciones.editar.motivoBloqueo).toBe(MOTIVOS_BLOQUEO.PLAZO_VENCIDO);
  });

  it('se habilita solicitar corrección', () => {
    expect(acciones.solicitar.habilitada).toBe(true);
  });
});

describe('accionesDisponibles: solicitud pendiente', () => {
  const conPendiente = jornada({
    creadaEn: haceHoras(30),
    solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE },
  });
  const acciones = accionesDisponibles(conPendiente, grupoActivo, AHORA);

  it('no se puede editar ni volver a solicitar', () => {
    expect(acciones.editar.habilitada).toBe(false);
    expect(acciones.solicitar.habilitada).toBe(false);
  });

  it('el motivo dice que hay una solicitud esperando', () => {
    expect(acciones.solicitar.motivoBloqueo).toBe(MOTIVOS_BLOQUEO.SOLICITUD_PENDIENTE);
  });
});

describe('accionesDisponibles: jornada OBSERVADA (RN-13)', () => {
  const observada = jornada({
    creadaEn: haceHoras(100),
    estado: ESTADO_JORNADA.OBSERVADA,
    solicitud: { estado: ESTADO_SOLICITUD.HABILITADA },
  });
  const acciones = accionesDisponibles(observada, grupoActivo, AHORA);

  it('se puede modificar', () => {
    expect(acciones.modificar.habilitada).toBe(true);
  });

  it('editar directo queda bloqueado y remite a Modificar jornada', () => {
    expect(acciones.editar.habilitada).toBe(false);
    expect(acciones.editar.motivoBloqueo).toBe(MOTIVOS_BLOQUEO.CORRECCION_HABILITADA);
  });
});

describe('accionesDisponibles: grupo inactivo (RN-03, §4.6)', () => {
  // Jornada creada hace un minuto: el plazo está abiertísimo, pero el grupo está cerrado.
  const acciones = accionesDisponibles(
    jornada({ creadaEn: haceHoras(0) }),
    grupoInactivo,
    AHORA,
  );

  it('todo lo que modifica queda bloqueado', () => {
    expect(acciones.editar.habilitada).toBe(false);
    expect(acciones.solicitar.habilitada).toBe(false);
    expect(acciones.modificar.habilitada).toBe(false);
  });

  it('el motivo es el grupo inactivo, no el plazo', () => {
    expect(acciones.editar.motivoBloqueo).toBe(MOTIVOS_BLOQUEO.GRUPO_INACTIVO);
    expect(acciones.solicitar.motivoBloqueo).toBe(MOTIVOS_BLOQUEO.GRUPO_INACTIVO);
  });

  it('consultar sigue permitido: Ver abre las mismas secciones', () => {
    expect(acciones.ver.habilitada).toBe(true);
  });
});

describe('accionesDisponibles: tras un rechazo (decisión A-09)', () => {
  const rechazada = jornada({
    creadaEn: haceHoras(40),
    solicitud: { estado: ESTADO_SOLICITUD.RECHAZADA },
  });
  const acciones = accionesDisponibles(rechazada, grupoActivo, AHORA);

  it('se puede volver a solicitar', () => {
    expect(acciones.solicitar.habilitada).toBe(true);
  });

  it('pero la jornada sigue bloqueada: el rechazo no habilita la edición (§4.10)', () => {
    expect(acciones.editar.habilitada).toBe(false);
    expect(acciones.modificar.habilitada).toBe(false);
  });
});

describe('accionesDocente (§5.7, §5.8)', () => {
  it('puede revisar una solicitud pendiente', () => {
    const conPendiente = jornada({ solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE } });
    expect(accionesDocente(conPendiente, grupoActivo).revisarSolicitud.habilitada).toBe(true);
  });

  it('no tiene nada que revisar si no hay solicitud', () => {
    expect(accionesDocente(jornada(), grupoActivo).revisarSolicitud.habilitada).toBe(false);
  });

  it('en un grupo inactivo no puede habilitar correcciones (§5.5)', () => {
    const conPendiente = jornada({ solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE } });
    const acciones = accionesDocente(conPendiente, grupoInactivo);
    expect(acciones.revisarSolicitud.habilitada).toBe(false);
    expect(acciones.revisarSolicitud.motivoBloqueo).toBe(MOTIVOS_BLOQUEO.GRUPO_INACTIVO);
  });

  it('siempre puede ver el historial', () => {
    expect(accionesDocente(jornada(), grupoInactivo).ver.habilitada).toBe(true);
  });
});

describe('camposEditables (decisión A-06)', () => {
  it('dentro del plazo se editan todos los campos permitidos', () => {
    const resultado = camposEditables(jornada(), grupoActivo, AHORA);
    expect(resultado.campos).toEqual(CAMPOS_EDITABLES_JORNADA);
  });

  it('la evidencia está entre los campos editables', () => {
    const resultado = camposEditables(jornada(), grupoActivo, AHORA);
    expect(resultado.campos).toContain('evidencia');
  });

  it('la fecha nunca es editable, ni siquiera recién creada (RN-11)', () => {
    const resultado = camposEditables(jornada(), grupoActivo, AHORA);
    expect(resultado.campos).not.toContain('fecha');
    expect(resultado.fechaBloqueada).toBe(true);
  });

  it('en estado OBSERVADA también se editan, con la fecha bloqueada (RN-13)', () => {
    const observada = jornada({
      creadaEn: haceHoras(100),
      estado: ESTADO_JORNADA.OBSERVADA,
      solicitud: { estado: ESTADO_SOLICITUD.HABILITADA },
    });
    const resultado = camposEditables(observada, grupoActivo, AHORA);
    expect(resultado.campos).toEqual(CAMPOS_EDITABLES_JORNADA);
    expect(resultado.fechaBloqueada).toBe(true);
  });

  it('sin permiso no hay ningún campo editable', () => {
    const resultado = camposEditables(jornada({ creadaEn: haceHoras(30) }), grupoActivo, AHORA);
    expect(resultado.campos).toEqual([]);
  });
});

describe('resumenEstado (§5.8)', () => {
  it('una jornada REGISTRADA puede tener una solicitud PENDIENTE a la vez', () => {
    const conPendiente = jornada({ solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE } });
    expect(resumenEstado(conPendiente)).toEqual({
      estadoJornada: ESTADO_JORNADA.REGISTRADA,
      estadoSolicitud: ESTADO_SOLICITUD.PENDIENTE,
      tieneSolicitudEnCurso: true,
    });
  });

  it('sin solicitud devuelve null en el estado de solicitud', () => {
    expect(resumenEstado(jornada()).estadoSolicitud).toBeNull();
  });
});
