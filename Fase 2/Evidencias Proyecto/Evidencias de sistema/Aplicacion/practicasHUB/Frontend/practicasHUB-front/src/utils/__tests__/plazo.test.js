import { describe, expect, it } from 'vitest';
import {
  dentroDelPlazo,
  horasRestantes,
  puedeEditarDirecto,
  puedeModificarObservada,
  puedeResolverSolicitud,
  puedeSolicitarCorreccion,
  tieneSolicitudEnCurso,
} from '../plazo';
import {
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  VENTANA_EDICION_MS,
} from '../constants';

/**
 * El reloj se inyecta, así que la ventana de 24 h (RN-11) se puede probar al minuto
 * sin esperar un día. Es el motivo por el que `ahora` es un parámetro y no `Date.now()`.
 */
const AHORA = new Date('2026-11-13T12:00:00.000Z');

const haceMs = (ms) => new Date(AHORA.getTime() - ms).toISOString();
const haceHoras = (horas) => haceMs(horas * 3_600_000);

const grupoActivo = { id: 'g', estado: ESTADO_GRUPO.ACTIVO };
const grupoInactivo = { id: 'g', estado: ESTADO_GRUPO.INACTIVO };

const jornada = (extras = {}) => ({
  id: 'j',
  estado: ESTADO_JORNADA.REGISTRADA,
  creadaEn: haceHoras(1),
  solicitud: null,
  ...extras,
});

describe('dentroDelPlazo (RN-11)', () => {
  it('una jornada recién creada está dentro', () => {
    expect(dentroDelPlazo(jornada({ creadaEn: haceHoras(0) }), AHORA)).toBe(true);
  });

  it('a las 23 h 59 min sigue dentro', () => {
    const casi = haceMs(VENTANA_EDICION_MS - 60_000);
    expect(dentroDelPlazo(jornada({ creadaEn: casi }), AHORA)).toBe(true);
  });

  it('a las 24 h 00 min 00 s ya está fuera: el límite es estricto', () => {
    const justo = haceMs(VENTANA_EDICION_MS);
    expect(dentroDelPlazo(jornada({ creadaEn: justo }), AHORA)).toBe(false);
  });

  it('a las 24 h 00 min 01 s está fuera', () => {
    const pasado = haceMs(VENTANA_EDICION_MS + 1000);
    expect(dentroDelPlazo(jornada({ creadaEn: pasado }), AHORA)).toBe(false);
  });

  it('una fecha de creación ilegible no abre el plazo', () => {
    expect(dentroDelPlazo(jornada({ creadaEn: 'ayer' }), AHORA)).toBe(false);
    expect(dentroDelPlazo(jornada({ creadaEn: null }), AHORA)).toBe(false);
  });
});

describe('horasRestantes', () => {
  it('descuenta lo transcurrido', () => {
    expect(horasRestantes(jornada({ creadaEn: haceHoras(6) }), AHORA)).toBe(18);
  });

  it('nunca es negativo', () => {
    expect(horasRestantes(jornada({ creadaEn: haceHoras(48) }), AHORA)).toBe(0);
  });
});

describe('puedeEditarDirecto (RN-11)', () => {
  it('sí dentro del plazo y con el grupo activo', () => {
    expect(puedeEditarDirecto(jornada(), grupoActivo, AHORA)).toBe(true);
  });

  it('no si el grupo está inactivo, aunque quede plazo (RN-03)', () => {
    expect(puedeEditarDirecto(jornada(), grupoInactivo, AHORA)).toBe(false);
  });

  it('no si el plazo venció', () => {
    expect(puedeEditarDirecto(jornada({ creadaEn: haceHoras(30) }), grupoActivo, AHORA)).toBe(false);
  });

  it('no si hay una solicitud pendiente: la jornada está bloqueada (RN-12)', () => {
    const conSolicitud = jornada({
      solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE },
    });
    expect(puedeEditarDirecto(conSolicitud, grupoActivo, AHORA)).toBe(false);
  });

  it('no si la jornada está OBSERVADA: eso se corrige con Modificar', () => {
    const observada = jornada({
      estado: ESTADO_JORNADA.OBSERVADA,
      solicitud: { estado: ESTADO_SOLICITUD.HABILITADA },
    });
    expect(puedeEditarDirecto(observada, grupoActivo, AHORA)).toBe(false);
  });
});

describe('puedeSolicitarCorreccion (RN-12)', () => {
  const vencida = (extras = {}) => jornada({ creadaEn: haceHoras(30), ...extras });

  it('sí cuando el plazo venció y no hay solicitud en curso', () => {
    expect(puedeSolicitarCorreccion(vencida(), grupoActivo, AHORA)).toBe(true);
  });

  it('no mientras el plazo sigue abierto: primero se edita directo', () => {
    expect(puedeSolicitarCorreccion(jornada(), grupoActivo, AHORA)).toBe(false);
  });

  it('no si el grupo está inactivo', () => {
    expect(puedeSolicitarCorreccion(vencida(), grupoInactivo, AHORA)).toBe(false);
  });

  it('no si ya hay una solicitud pendiente', () => {
    const conPendiente = vencida({ solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE } });
    expect(puedeSolicitarCorreccion(conPendiente, grupoActivo, AHORA)).toBe(false);
  });

  it('SÍ después de un rechazo: se puede volver a solicitar (decisión A-09)', () => {
    const rechazada = vencida({ solicitud: { estado: ESTADO_SOLICITUD.RECHAZADA } });
    expect(puedeSolicitarCorreccion(rechazada, grupoActivo, AHORA)).toBe(true);
  });

  it('sí después de una corrección ya completada', () => {
    const completada = vencida({ solicitud: { estado: ESTADO_SOLICITUD.COMPLETADA } });
    expect(puedeSolicitarCorreccion(completada, grupoActivo, AHORA)).toBe(true);
  });
});

describe('puedeModificarObservada (RN-13)', () => {
  const observada = {
    ...jornada({ creadaEn: haceHoras(100) }),
    estado: ESTADO_JORNADA.OBSERVADA,
    solicitud: { estado: ESTADO_SOLICITUD.HABILITADA },
  };

  it('sí, y no depende del plazo de 24 h', () => {
    expect(puedeModificarObservada(observada, grupoActivo)).toBe(true);
  });

  it('no si el grupo está inactivo', () => {
    expect(puedeModificarObservada(observada, grupoInactivo)).toBe(false);
  });

  it('no si la jornada está REGISTRADA', () => {
    expect(puedeModificarObservada(jornada(), grupoActivo)).toBe(false);
  });

  it('no si la solicitud ya se completó', () => {
    const cerrada = { ...observada, solicitud: { estado: ESTADO_SOLICITUD.COMPLETADA } };
    expect(puedeModificarObservada(cerrada, grupoActivo)).toBe(false);
  });
});

describe('puedeResolverSolicitud (§5.8)', () => {
  it('sí si está pendiente y el grupo está activo', () => {
    const conPendiente = jornada({ solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE } });
    expect(puedeResolverSolicitud(conPendiente, grupoActivo)).toBe(true);
  });

  it('no si el grupo está inactivo: el docente no habilita correcciones ahí (§5.5)', () => {
    const conPendiente = jornada({ solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE } });
    expect(puedeResolverSolicitud(conPendiente, grupoInactivo)).toBe(false);
  });

  it('no si no hay solicitud', () => {
    expect(puedeResolverSolicitud(jornada(), grupoActivo)).toBe(false);
  });
});

describe('tieneSolicitudEnCurso', () => {
  it('pendiente y habilitada cuentan como en curso', () => {
    expect(tieneSolicitudEnCurso(jornada({ solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE } }))).toBe(true);
    expect(tieneSolicitudEnCurso(jornada({ solicitud: { estado: ESTADO_SOLICITUD.HABILITADA } }))).toBe(true);
  });

  it('rechazada y completada no', () => {
    expect(tieneSolicitudEnCurso(jornada({ solicitud: { estado: ESTADO_SOLICITUD.RECHAZADA } }))).toBe(false);
    expect(tieneSolicitudEnCurso(jornada({ solicitud: { estado: ESTADO_SOLICITUD.COMPLETADA } }))).toBe(false);
    expect(tieneSolicitudEnCurso(jornada())).toBe(false);
  });
});
