import { describe, expect, it } from 'vitest';
import {
  MENU_GENERAL, baseDeGrupo, menuDeGrupo, salidaDeGrupo,
} from '../navegacion';
import { ROLES } from '../../utils/constants';



describe('menú general (§2.2)', () => {
  it('el estudiante ve Dashboard y Notificaciones', () => {
    expect(MENU_GENERAL[ROLES.ESTUDIANTE].map((e) => e.etiqueta))
      .toEqual(['Dashboard', 'Notificaciones']);
  });

  it('el docente, sin grupo cargado, ve exactamente lo mismo (§5)', () => {
    expect(MENU_GENERAL[ROLES.DOCENTE].map((e) => e.etiqueta))
      .toEqual(['Dashboard', 'Notificaciones']);
  });

  it('no aparece Reportes: está fuera del alcance del MVP', () => {
    const todas = Object.values(MENU_GENERAL).flat().map((e) => e.etiqueta);
    expect(todas).not.toContain('Reportes');
  });
});

describe('menú interno del grupo (§2.2)', () => {
  it('el estudiante ve las cinco secciones, en orden', () => {
    expect(menuDeGrupo(ROLES.ESTUDIANTE, 'gru_1').map((e) => e.etiqueta))
      .toEqual(['Resumen', 'Mi práctica', 'Jornadas', 'Documentos', 'Notificaciones']);
  });

  it('el docente ve Estudiantes donde el estudiante ve Mi práctica', () => {
    expect(menuDeGrupo(ROLES.DOCENTE, 'gru_1').map((e) => e.etiqueta))
      .toEqual(['Resumen', 'Estudiantes', 'Jornadas', 'Documentos', 'Notificaciones']);
  });

  it('todas las rutas internas llevan el grupo en la URL (RN-04)', () => {
    [ROLES.ESTUDIANTE, ROLES.DOCENTE].forEach((rol) => {
      menuDeGrupo(rol, 'gru_7').forEach((enlace) => {
        expect(enlace.a).toContain('/grupos/gru_7/');
      });
    });
  });

  it('cambiar de grupo cambia todas las rutas del menú', () => {
    const uno = menuDeGrupo(ROLES.ESTUDIANTE, 'gru_1').map((e) => e.a);
    const otro = menuDeGrupo(ROLES.ESTUDIANTE, 'gru_2').map((e) => e.a);
    expect(uno.some((ruta) => otro.includes(ruta))).toBe(false);
  });

  it('no existe Bitácora: el glosario dice Jornadas (§10)', () => {
    const todas = [ROLES.ESTUDIANTE, ROLES.DOCENTE]
      .flatMap((rol) => menuDeGrupo(rol, 'g').map((e) => e.etiqueta));
    expect(todas).not.toContain('Bitácora');
    expect(todas).not.toContain('Revisiones');
  });

  it('el menú interno no depende del estado del grupo (§1)', () => {
    // Ingresar y Ver abren las mismas secciones: la función ni siquiera recibe el estado.
    expect(menuDeGrupo.length).toBe(2);
  });
});

describe('salida del grupo (§2.2)', () => {
  it('cada perfil usa el texto literal del manual', () => {
    expect(salidaDeGrupo(ROLES.ESTUDIANTE).etiqueta).toBe('Volver a mis prácticas');
    expect(salidaDeGrupo(ROLES.DOCENTE).etiqueta).toBe('Volver a grupos');
  });

  it('la salida devuelve al Dashboard general, no a otro grupo (§9)', () => {
    expect(salidaDeGrupo(ROLES.ESTUDIANTE).a).toBe('/estudiante/dashboard');
    expect(salidaDeGrupo(ROLES.DOCENTE).a).toBe('/docente/dashboard');
  });
});

describe('baseDeGrupo', () => {
  it('separa los espacios de cada perfil', () => {
    expect(baseDeGrupo(ROLES.ESTUDIANTE, 'g1')).toBe('/estudiante/grupos/g1');
    expect(baseDeGrupo(ROLES.DOCENTE, 'g1')).toBe('/docente/grupos/g1');
  });
});
