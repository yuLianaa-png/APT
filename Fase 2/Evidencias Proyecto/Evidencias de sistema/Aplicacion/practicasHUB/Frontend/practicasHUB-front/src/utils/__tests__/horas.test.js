import { describe, expect, it } from 'vitest';
import {
  aHora,
  aMinutos,
  avanceMeta,
  calcularHoras,
  formatearDescanso,
  formatearHoras,
  validarDuracion,
} from '../horas';

describe('aMinutos', () => {
  it('convierte horas válidas', () => {
    expect(aMinutos('00:00')).toBe(0);
    expect(aMinutos('08:30')).toBe(510);
    expect(aMinutos('23:59')).toBe(1439);
  });

  it('rechaza lo que no es una hora', () => {
    expect(aMinutos('24:00')).toBeNull();
    expect(aMinutos('08:60')).toBeNull();
    expect(aMinutos('8.30')).toBeNull();
    expect(aMinutos('')).toBeNull();
    expect(aMinutos(null)).toBeNull();
    expect(aMinutos(830)).toBeNull();
  });
});

describe('calcularHoras (RN-07)', () => {
  it('resta el descanso', () => {
    // 08:30 a 17:30 son 9 h; menos 45 min de descanso, 8,25.
    expect(calcularHoras('08:30', '17:30', 45)).toBe(8.25);
  });

  it('sin descanso devuelve la diferencia completa', () => {
    expect(calcularHoras('09:00', '17:00', 0)).toBe(8);
  });

  it('trata el descanso ausente como cero', () => {
    expect(calcularHoras('09:00', '17:00')).toBe(8);
  });

  it('redondea a dos decimales', () => {
    // 10 minutos son 0,1666… horas.
    expect(calcularHoras('09:00', '09:10', 0)).toBe(0.17);
  });

  it('devuelve null si los horarios no se pueden interpretar', () => {
    expect(calcularHoras('abc', '17:00', 0)).toBeNull();
  });

  it('no inventa un tope: una jornada de 14 h se calcula tal cual (RN-15)', () => {
    expect(calcularHoras('06:00', '20:00', 0)).toBe(14);
  });
});

describe('validarDuracion (RN-08)', () => {
  it('acepta una jornada normal', () => {
    expect(validarDuracion('08:30', '17:30', 45).valido).toBe(true);
  });

  it('rechaza término igual al inicio', () => {
    const resultado = validarDuracion('09:00', '09:00', 0);
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toMatch(/posterior/i);
  });

  it('rechaza término anterior al inicio', () => {
    expect(validarDuracion('17:00', '09:00', 0).valido).toBe(false);
  });

  it('rechaza un descanso que deja la jornada sin duración', () => {
    // 09:00 a 10:00 es 1 h; 60 min de descanso dejan cero.
    const resultado = validarDuracion('09:00', '10:00', 60);
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toMatch(/descanso/i);
  });

  it('rechaza un descanso mayor que la jornada', () => {
    expect(validarDuracion('09:00', '10:00', 90).valido).toBe(false);
  });

  it('acepta un descanso que deja un solo minuto', () => {
    expect(validarDuracion('09:00', '10:00', 59).valido).toBe(true);
  });

  it('rechaza descansos negativos o fraccionarios', () => {
    expect(validarDuracion('09:00', '17:00', -30).valido).toBe(false);
    expect(validarDuracion('09:00', '17:00', 30.5).valido).toBe(false);
  });

  it('NO rechaza una jornada larga: no existe tope diario (RN-15)', () => {
    expect(validarDuracion('06:00', '20:00', 0).valido).toBe(true);
    expect(validarDuracion('00:00', '23:59', 0).valido).toBe(true);
  });
});

describe('formato', () => {
  it('formatea horas al uso chileno', () => {
    expect(formatearHoras(8)).toBe('8');
    expect(formatearHoras(8.25)).toBe('8,25');
    expect(formatearHoras(7.5)).toBe('7,5');
  });

  it('formatea el descanso en minutos', () => {
    expect(formatearDescanso(0)).toBe('Sin descanso');
    expect(formatearDescanso(45)).toBe('45 min');
    expect(formatearDescanso(60)).toBe('1 h');
    expect(formatearDescanso(90)).toBe('1 h 30 min');
  });

  it('reconstruye la hora desde minutos', () => {
    expect(aHora(510)).toBe('08:30');
    expect(aHora(0)).toBe('00:00');
  });
});

describe('avanceMeta (RN-06)', () => {
  it('calcula restantes y porcentaje', () => {
    const avance = avanceMeta(180, 360);
    expect(avance.restantes).toBe(180);
    expect(avance.porcentaje).toBe(50);
    expect(avance.metaAlcanzada).toBe(false);
  });

  it('la meta no es un máximo: las horas siguen pero restantes no baja de cero', () => {
    const avance = avanceMeta(412, 360);
    expect(avance.registradas).toBe(412);
    expect(avance.restantes).toBe(0);
    expect(avance.porcentaje).toBe(100);
    expect(avance.metaAlcanzada).toBe(true);
  });

  it('no divide por cero si el grupo no tiene meta', () => {
    expect(avanceMeta(10, 0).porcentaje).toBe(0);
  });
});
