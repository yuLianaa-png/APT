import { describe, expect, it } from 'vitest';
import {
  TODOS, aniosDisponibles, filtrarPorCriterios, normalizar, opcionesDeAnio,
} from '../filtros';
import { ESTADO_GRUPO } from '../constants';

const GRUPOS = [
  {
    id: 'g1',
    nombre: 'Práctica Laboral 2026 — Informática',
    codigo: 'PRL-2026-A4F2',
    anio: 2026,
    estado: ESTADO_GRUPO.ACTIVO,
    docenteNombre: 'Carolina Soto Lagos',
  },
  {
    id: 'g2',
    nombre: 'Práctica Profesional 2026 — Desarrollo',
    codigo: 'PRP-2026-B7K9',
    anio: 2026,
    estado: ESTADO_GRUPO.ACTIVO,
    docenteNombre: 'Carolina Soto Lagos',
  },
  {
    id: 'g3',
    nombre: 'Práctica Laboral 2025 — Soporte',
    codigo: 'PRL-2025-C1D8',
    anio: 2025,
    estado: ESTADO_GRUPO.INACTIVO,
    docenteNombre: 'Rodrigo Peña M.',
  },
];

const ids = (filas) => filas.map((f) => f.id);

describe('normalizar', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(normalizar('Informática')).toBe('informatica');
    expect(normalizar('  PEÑA  ')).toBe('pena');
  });

  it('tolera valores ausentes', () => {
    expect(normalizar(null)).toBe('');
    expect(normalizar(undefined)).toBe('');
  });
});

describe('filtrarPorCriterios: texto (RF-02, §4.1, §5.1)', () => {
  it('sin criterios devuelve todo', () => {
    expect(filtrarPorCriterios(GRUPOS)).toHaveLength(3);
    expect(filtrarPorCriterios(GRUPOS, { texto: '   ' })).toHaveLength(3);
  });

  it('busca por nombre', () => {
    expect(ids(filtrarPorCriterios(GRUPOS, { texto: 'Laboral' }))).toEqual(['g1', 'g3']);
  });

  it('busca por nombre sin tildes', () => {
    // «Informatica» tiene que encontrar «Informática».
    expect(ids(filtrarPorCriterios(GRUPOS, { texto: 'informatica' }))).toEqual(['g1']);
  });

  it('busca por código, entero o parcial (RF-02)', () => {
    expect(ids(filtrarPorCriterios(GRUPOS, { texto: 'PRL-2026-A4F2' }))).toEqual(['g1']);
    expect(ids(filtrarPorCriterios(GRUPOS, { texto: 'prp' }))).toEqual(['g2']);
  });

  it('busca por nombre del docente', () => {
    expect(ids(filtrarPorCriterios(GRUPOS, { texto: 'rodrigo' }))).toEqual(['g3']);
  });

  it('sin coincidencias devuelve lista vacía, no todo', () => {
    expect(filtrarPorCriterios(GRUPOS, { texto: 'contabilidad' })).toEqual([]);
  });
});

describe('filtrarPorCriterios: año (§5.1, §5.3)', () => {
  it('filtra por año', () => {
    expect(ids(filtrarPorCriterios(GRUPOS, { anio: 2026 }))).toEqual(['g1', 'g2']);
    expect(ids(filtrarPorCriterios(GRUPOS, { anio: '2025' }))).toEqual(['g3']);
  });

  it('TODOS no filtra', () => {
    expect(filtrarPorCriterios(GRUPOS, { anio: TODOS })).toHaveLength(3);
  });
});

describe('filtrarPorCriterios: estado (RF-02)', () => {
  it('filtra por estado', () => {
    expect(ids(filtrarPorCriterios(GRUPOS, { estado: ESTADO_GRUPO.INACTIVO }))).toEqual(['g3']);
  });

  it('los grupos inactivos siguen apareciendo sin filtro: no se ocultan (RN-03)', () => {
    expect(ids(filtrarPorCriterios(GRUPOS))).toContain('g3');
  });
});

describe('filtrarPorCriterios: los criterios se combinan', () => {
  it('texto y año a la vez', () => {
    expect(ids(filtrarPorCriterios(GRUPOS, { texto: 'Laboral', anio: 2026 }))).toEqual(['g1']);
  });

  it('texto, año y estado a la vez', () => {
    const resultado = filtrarPorCriterios(GRUPOS, {
      texto: 'Laboral',
      anio: 2025,
      estado: ESTADO_GRUPO.INACTIVO,
    });
    expect(ids(resultado)).toEqual(['g3']);
  });

  it('una combinación imposible no devuelve nada', () => {
    // No hay ninguna práctica laboral activa de 2025.
    const resultado = filtrarPorCriterios(GRUPOS, {
      texto: 'Laboral',
      anio: 2025,
      estado: ESTADO_GRUPO.ACTIVO,
    });
    expect(resultado).toEqual([]);
  });

  it('no muta la lista original', () => {
    const copia = [...GRUPOS];
    filtrarPorCriterios(GRUPOS, { texto: 'Laboral' });
    expect(GRUPOS).toEqual(copia);
  });
});

describe('años disponibles', () => {
  it('se derivan de los datos, del más reciente al más antiguo', () => {
    expect(aniosDisponibles(GRUPOS)).toEqual([2026, 2025]);
  });

  it('no repite años', () => {
    expect(aniosDisponibles(GRUPOS)).toHaveLength(2);
  });

  it('ignora filas sin año', () => {
    expect(aniosDisponibles([...GRUPOS, { anio: null }])).toEqual([2026, 2025]);
  });

  it('las opciones llevan «Todos» delante', () => {
    const opciones = opcionesDeAnio(GRUPOS);
    expect(opciones[0].valor).toBe(TODOS);
    expect(opciones.map((o) => o.etiqueta)).toEqual(['Todos los años', '2026', '2025']);
  });

  it('con lista vacía solo queda «Todos»', () => {
    expect(opcionesDeAnio([])).toHaveLength(1);
  });
});
