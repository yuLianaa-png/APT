import { describe, expect, it } from 'vitest';
import { RUTA_INICIO, rutaInicioDe } from '../rutas';
import { ROLES } from '../../utils/constants';

describe('rutaInicioDe (§2, §3)', () => {
  it('cada perfil entra a su propio Dashboard general', () => {
    expect(rutaInicioDe(ROLES.ESTUDIANTE)).toBe('/estudiante/dashboard');
    expect(rutaInicioDe(ROLES.DOCENTE)).toBe('/docente/dashboard');
  });

  it('ambos destinos son el Dashboard general, no una vista interna (RN-04)', () => {
    // Nadie debe aterrizar dentro de un grupo: primero se elige en cuál entrar.
    Object.values(RUTA_INICIO).forEach((ruta) => {
      expect(ruta).toMatch(/\/dashboard$/);
      expect(ruta).not.toMatch(/grupo/);
    });
  });

  it('un rol que ya no existe va al login, no a un panel cualquiera', () => {
    // SUPERVISOR y ADMIN eran roles del prototipo anterior.
    expect(rutaInicioDe('SUPERVISOR')).toBe('/login');
    expect(rutaInicioDe('ADMIN')).toBe('/login');
    expect(rutaInicioDe(undefined)).toBe('/login');
    expect(rutaInicioDe(null)).toBe('/login');
  });

  it('solo hay dos perfiles con destino propio', () => {
    expect(Object.keys(RUTA_INICIO).sort()).toEqual(['DOCENTE', 'ESTUDIANTE']);
  });
});
