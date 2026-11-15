import { describe, expect, it } from 'vitest';
import {
  aFechaISO,
  anioDelGrupo,
  esFechaValida,
  fechaRepetida,
  fechasDuplicadasEnTanda,
  formatearFecha,
  formatearInstante,
  porFechaDescendente,
} from '../fechas';

describe('anioDelGrupo (§5.3)', () => {
  it('el año sale de la fecha de creación del grupo', () => {
    expect(anioDelGrupo('2026-03-15T10:00:00.000Z')).toBe(2026);
    expect(anioDelGrupo('2025-12-31T23:00:00.000Z')).toBe(2025);
  });

  it('devuelve null si no hay fecha o es ilegible', () => {
    expect(anioDelGrupo(null)).toBeNull();
    expect(anioDelGrupo('no es una fecha')).toBeNull();
  });
});

describe('formato de fechas', () => {
  it('formatea la fecha de una jornada', () => {
    expect(formatearFecha('2026-09-18')).toBe('18/09/2026');
  });

  it('acepta un instante completo y toma el día', () => {
    expect(formatearFecha('2026-09-18T14:30:00.000Z')).toBe('18/09/2026');
  });

  it('devuelve vacío con una entrada inválida en lugar de "NaN/NaN"', () => {
    expect(formatearFecha('18-09-2026')).toBe('');
    expect(formatearFecha(null)).toBe('');
    expect(formatearInstante('cualquier cosa')).toBe('');
  });

  it('convierte un instante en día civil', () => {
    const fecha = new Date(2026, 8, 18, 23, 30);
    expect(aFechaISO(fecha)).toBe('2026-09-18');
  });
});

describe('esFechaValida', () => {
  it('acepta fechas que existen', () => {
    expect(esFechaValida('2026-09-18')).toBe(true);
    expect(esFechaValida('2024-02-29')).toBe(true);
  });

  it('rechaza días que no existen', () => {
    expect(esFechaValida('2026-02-30')).toBe(false);
    expect(esFechaValida('2026-13-01')).toBe(false);
    expect(esFechaValida('2025-02-29')).toBe(false);
  });

  it('rechaza formatos distintos', () => {
    expect(esFechaValida('18/09/2026')).toBe(false);
    expect(esFechaValida('2026-9-18')).toBe(false);
    expect(esFechaValida(null)).toBe(false);
  });
});

describe('fechaRepetida (RN-09)', () => {
  const jornadas = [
    { id: 'j1', fecha: '2026-09-18' },
    { id: 'j2', fecha: '2026-09-19' },
  ];

  it('detecta una fecha ya usada en la práctica', () => {
    expect(fechaRepetida('2026-09-18', jornadas)).toBe(true);
  });

  it('acepta una fecha nueva', () => {
    expect(fechaRepetida('2026-09-20', jornadas)).toBe(false);
  });

  it('al editar, la jornada no choca consigo misma', () => {
    expect(fechaRepetida('2026-09-18', jornadas, 'j1')).toBe(false);
  });

  it('sin historial no hay repetición', () => {
    expect(fechaRepetida('2026-09-18', [])).toBe(false);
  });

  it('el llamador pasa solo las del mismo grupo: la misma fecha vale en otro grupo', () => {
    // RN-09 se aplica por práctica, no globalmente. Si la lista solo trae las del
    // grupo 2, una fecha usada en el grupo 1 no se considera repetida.
    const soloGrupo2 = [{ id: 'j9', fecha: '2026-09-25' }];
    expect(fechaRepetida('2026-09-18', soloGrupo2)).toBe(false);
  });
});

describe('fechasDuplicadasEnTanda (§4.17)', () => {
  it('detecta repetidas dentro del propio formulario', () => {
    expect(fechasDuplicadasEnTanda(['2026-09-18', '2026-09-19', '2026-09-18']))
      .toEqual(['2026-09-18']);
  });

  it('no devuelve nada si todas son distintas', () => {
    expect(fechasDuplicadasEnTanda(['2026-09-18', '2026-09-19'])).toEqual([]);
  });

  it('con una sola jornada no hay duplicados', () => {
    expect(fechasDuplicadasEnTanda(['2026-09-18'])).toEqual([]);
  });
});

describe('porFechaDescendente', () => {
  it('ordena de la jornada más reciente a la más antigua', () => {
    const jornadas = [
      { fecha: '2026-09-18', creadaEn: '2026-09-18T20:00:00.000Z' },
      { fecha: '2026-09-20', creadaEn: '2026-09-20T20:00:00.000Z' },
      { fecha: '2026-09-19', creadaEn: '2026-09-19T20:00:00.000Z' },
    ];
    expect([...jornadas].sort(porFechaDescendente).map((j) => j.fecha))
      .toEqual(['2026-09-20', '2026-09-19', '2026-09-18']);
  });

  it('con la misma fecha, decide el instante de creación', () => {
    const jornadas = [
      { id: 'vieja', fecha: '2026-09-18', creadaEn: '2026-09-18T08:00:00.000Z' },
      { id: 'nueva', fecha: '2026-09-18', creadaEn: '2026-09-18T20:00:00.000Z' },
    ];
    expect([...jornadas].sort(porFechaDescendente)[0].id).toBe('nueva');
  });
});
