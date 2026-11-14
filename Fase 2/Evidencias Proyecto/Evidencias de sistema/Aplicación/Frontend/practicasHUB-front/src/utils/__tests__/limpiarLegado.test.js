import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { limpiarLegado } from '../limpiarLegado';
import { CLAVES_HEREDADAS, STORAGE_KEYS } from '../constants';

/**
 * Los tests corren en Node, donde no hay `localStorage`: se monta uno mínimo para poder
 * comprobar qué borra y, sobre todo, **qué no toca**.
 */
const montarAlmacenamiento = (inicial = {}) => {
  const datos = { ...inicial };
  const almacen = {
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => { datos[k] = String(v); },
    removeItem: (k) => { delete datos[k]; },
  };
  globalThis.window = { localStorage: almacen };
  return datos;
};

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  delete globalThis.window;
  vi.restoreAllMocks();
});

describe('limpiarLegado', () => {
  it('borra las claves del prototipo que estén presentes', () => {
    const datos = montarAlmacenamiento({
      practicahub_actividades: '[]',
      practicahub_ultima_actividad: '{}',
    });

    const borradas = limpiarLegado();

    expect(borradas.sort()).toEqual(['practicahub_actividades', 'practicahub_ultima_actividad']);
    expect(Object.keys(datos)).toHaveLength(0);
  });

  it('no toca la sesión actual', () => {
    const datos = montarAlmacenamiento({
      practicahub_actividades: '[]',
      [STORAGE_KEYS.TOKEN]: 'mock.est_1.ESTUDIANTE',
      [STORAGE_KEYS.USER]: '{"id":"est_1"}',
    });

    limpiarLegado();

    expect(datos[STORAGE_KEYS.TOKEN]).toBe('mock.est_1.ESTUDIANTE');
    expect(datos[STORAGE_KEYS.USER]).toBe('{"id":"est_1"}');
  });

  it('no toca el almacén de datos simulados', () => {
    // Es lo que se perdió una vez por usar `localStorage.clear()`; esta función no
    // debe repetir ese error. Ver la trampa del mismo nombre.
    const datos = montarAlmacenamiento({
      practicahub_actividades: '[]',
      practicashub_mock_v1: '{"grupos":[]}',
    });

    limpiarLegado();

    expect(datos.practicashub_mock_v1).toBe('{"grupos":[]}');
  });

  it('con el almacenamiento limpio no borra nada', () => {
    montarAlmacenamiento({ [STORAGE_KEYS.TOKEN]: 'x' });
    expect(limpiarLegado()).toEqual([]);
  });

  it('la clave del token antiguo está en la lista: cambió de nombre', () => {
    // El prototipo usaba `practicahub_token`, sin la «s».
    expect(CLAVES_HEREDADAS).toContain('practicahub_token');
    expect(CLAVES_HEREDADAS).not.toContain(STORAGE_KEYS.TOKEN);
  });

  it('no revienta si el almacenamiento está bloqueado', () => {
    globalThis.window = {
      localStorage: {
        getItem: () => { throw new Error('bloqueado'); },
        setItem: () => { throw new Error('bloqueado'); },
        removeItem: () => { throw new Error('bloqueado'); },
      },
    };
    expect(() => limpiarLegado()).not.toThrow();
    expect(limpiarLegado()).toEqual([]);
  });

  it('fuera del navegador devuelve una lista vacía', () => {
    delete globalThis.window;
    expect(limpiarLegado()).toEqual([]);
  });
});
