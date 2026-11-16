import { describe, expect, it } from 'vitest';
import { ESTADO_FILA, TODOS, filtrarJornadas } from '../filtros';
import { ESTADO_JORNADA, ESTADO_SOLICITUD } from '../constants';

/**
 * Filtros de la vista Jornadas (§4.7): fecha, actividad y estado.
 */

const JORNADAS = [
  {
    id: 'j1',
    fecha: '2026-09-18',
    actividadPrincipal: 'Pruebas funcionales del módulo de usuarios',
    descripcion: 'Casos de prueba y hallazgos.',
    estado: ESTADO_JORNADA.REGISTRADA,
    solicitud: null,
  },
  {
    id: 'j2',
    fecha: '2026-09-20',
    actividadPrincipal: 'Soporte en mesa de ayuda',
    descripcion: null,
    estado: ESTADO_JORNADA.REGISTRADA,
    solicitud: { estado: ESTADO_SOLICITUD.PENDIENTE },
  },
  {
    id: 'j3',
    fecha: '2026-09-25',
    actividadPrincipal: 'Documentación técnica',
    descripcion: 'Manual de despliegue.',
    estado: ESTADO_JORNADA.OBSERVADA,
    solicitud: { estado: ESTADO_SOLICITUD.HABILITADA },
  },
  {
    id: 'j4',
    fecha: '2026-10-02',
    actividadPrincipal: 'Migración de datos',
    descripcion: null,
    estado: ESTADO_JORNADA.REGISTRADA,
    solicitud: { estado: ESTADO_SOLICITUD.RECHAZADA },
  },
];

const ids = (filas) => filas.map((f) => f.id);
/** j1 es la única que sigue dentro de la ventana de 24 h. */
const esEditable = (jornada) => jornada.id === 'j1';

describe('filtro por fecha', () => {
  it('sin criterios devuelve todo', () => {
    expect(filtrarJornadas(JORNADAS)).toHaveLength(4);
  });

  it('acota por «desde»', () => {
    expect(ids(filtrarJornadas(JORNADAS, { desde: '2026-09-20' }))).toEqual(['j2', 'j3', 'j4']);
  });

  it('acota por «hasta»', () => {
    expect(ids(filtrarJornadas(JORNADAS, { hasta: '2026-09-20' }))).toEqual(['j1', 'j2']);
  });

  it('los extremos son inclusive', () => {
    const resultado = filtrarJornadas(JORNADAS, { desde: '2026-09-20', hasta: '2026-09-20' });
    expect(ids(resultado)).toEqual(['j2']);
  });

  it('un rango que cruza el cambio de mes se compara bien', () => {
    // Comparar 'YYYY-MM-DD' como texto funciona porque el formato está acolchado.
    const resultado = filtrarJornadas(JORNADAS, { desde: '2026-09-25', hasta: '2026-10-02' });
    expect(ids(resultado)).toEqual(['j3', 'j4']);
  });

  it('un rango sin jornadas devuelve lista vacía', () => {
    expect(filtrarJornadas(JORNADAS, { desde: '2027-01-01' })).toEqual([]);
  });
});

describe('filtro por actividad', () => {
  it('busca en la actividad principal', () => {
    expect(ids(filtrarJornadas(JORNADAS, { actividad: 'soporte' }))).toEqual(['j2']);
  });

  it('ignora tildes', () => {
    expect(ids(filtrarJornadas(JORNADAS, { actividad: 'documentacion' }))).toEqual(['j3']);
  });

  it('busca también en la descripción: ahí está el detalle', () => {
    expect(ids(filtrarJornadas(JORNADAS, { actividad: 'despliegue' }))).toEqual(['j3']);
  });

  it('tolera descripciones vacías', () => {
    expect(() => filtrarJornadas(JORNADAS, { actividad: 'x' })).not.toThrow();
  });
});

describe('filtro por estado', () => {
  it('TODOS no filtra', () => {
    expect(filtrarJornadas(JORNADAS, { estado: TODOS })).toHaveLength(4);
  });

  it('REGISTRADA trae las registradas, tengan o no solicitud (§5.8)', () => {
    // j2 está registrada y a la vez tiene una solicitud pendiente: cuenta como registrada.
    expect(ids(filtrarJornadas(JORNADAS, { estado: ESTADO_JORNADA.REGISTRADA })))
      .toEqual(['j1', 'j2', 'j4']);
  });

  it('OBSERVADA trae las que el docente habilitó (RN-13)', () => {
    expect(ids(filtrarJornadas(JORNADAS, { estado: ESTADO_JORNADA.OBSERVADA }))).toEqual(['j3']);
  });

  it('SOLICITUD_PENDIENTE mira la solicitud, no la jornada', () => {
    const resultado = filtrarJornadas(JORNADAS, { estado: ESTADO_FILA.SOLICITUD_PENDIENTE });
    expect(ids(resultado)).toEqual(['j2']);
  });

  it('una solicitud rechazada no cuenta como pendiente', () => {
    const resultado = filtrarJornadas(JORNADAS, { estado: ESTADO_FILA.SOLICITUD_PENDIENTE });
    expect(ids(resultado)).not.toContain('j4');
  });

  it('EDITABLE pregunta por el reloj, no por un estado guardado (RN-11)', () => {
    const resultado = filtrarJornadas(JORNADAS, { estado: ESTADO_FILA.EDITABLE }, esEditable);
    expect(ids(resultado)).toEqual(['j1']);
  });

  it('sin saber el plazo, EDITABLE no devuelve nada en lugar de mentir', () => {
    expect(filtrarJornadas(JORNADAS, { estado: ESTADO_FILA.EDITABLE })).toEqual([]);
  });
});

describe('los criterios se combinan', () => {
  it('fecha y estado a la vez', () => {
    const resultado = filtrarJornadas(JORNADAS, {
      desde: '2026-09-20',
      estado: ESTADO_JORNADA.REGISTRADA,
    });
    expect(ids(resultado)).toEqual(['j2', 'j4']);
  });

  it('actividad y estado a la vez', () => {
    const resultado = filtrarJornadas(JORNADAS, {
      actividad: 'pruebas',
      estado: ESTADO_FILA.EDITABLE,
    }, esEditable);
    expect(ids(resultado)).toEqual(['j1']);
  });

  it('una combinación imposible no devuelve nada', () => {
    const resultado = filtrarJornadas(JORNADAS, {
      actividad: 'soporte',
      estado: ESTADO_JORNADA.OBSERVADA,
    });
    expect(resultado).toEqual([]);
  });

  it('no muta la lista original', () => {
    const copia = [...JORNADAS];
    filtrarJornadas(JORNADAS, { actividad: 'soporte' });
    expect(JORNADAS).toEqual(copia);
  });
});
