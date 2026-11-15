import { describe, expect, it } from 'vitest';
import {
  rolSegunCorreo,
  validarContrasena,
  validarCorreo,
  validarNombre,
  validarRegistro,
  validarRol,
} from '../registro';
import { ROLES } from '../constants';

/**
 * El registro solo admite correos institucionales, y cada dominio corresponde a un
 * perfil: @duocuc.cl a estudiantes, @duoc.cl a docentes. Estas pruebas protegen esa
 * regla y que cada mensaje diga qué corregir.
 */

const valido = {
  nombre: 'Camila Vera Núñez',
  correo: 'camila.vera@duocuc.cl',
  password: 'clave1234',
  rol: ROLES.ESTUDIANTE,
};

describe('validarNombre', () => {
  it('rechaza un nombre vacío', () => {
    expect(validarNombre('   ')).toMatch(/nombre completo/i);
  });

  it('rechaza una sola palabra: pide nombre y apellido', () => {
    expect(validarNombre('Camila')).toMatch(/apellido/i);
  });

  it('rechaza palabras de una letra o con números', () => {
    expect(validarNombre('C V')).not.toBeNull();
    expect(validarNombre('Camila 123')).not.toBeNull();
  });

  it('rechaza un nombre que pasa del máximo', () => {
    expect(validarNombre(`${'Ana '.repeat(40)}Soto`)).toMatch(/120/);
  });

  it('acepta tildes, ñ, guiones y apellidos abreviados', () => {
    expect(validarNombre('Jonatán Barrios R.')).toBeNull();
    expect(validarNombre('María Peña-Núñez')).toBeNull();
  });
});

describe('validarCorreo y rolSegunCorreo', () => {
  it('rechaza un dominio ajeno y dice que debe ser institucional', () => {
    expect(validarCorreo('camila@gmail.com')).toMatch(/institucionales/i);
  });

  it('rechaza un correo sin forma válida', () => {
    expect(validarCorreo('camila.vera')).toMatch(/formato/i);
  });

  it('no deja pasar un dominio que solo termina parecido', () => {
    expect(validarCorreo('camila@miduocuc.cl')).not.toBeNull();
    expect(rolSegunCorreo('camila@duocuc.cl.evil.com')).toBeNull();
  });

  it('@duocuc.cl es de estudiante y @duoc.cl de docente, sin importar mayúsculas', () => {
    expect(rolSegunCorreo(' Camila.Vera@DUOCUC.cl ')).toBe(ROLES.ESTUDIANTE);
    expect(rolSegunCorreo('carolina.soto@duoc.cl')).toBe(ROLES.DOCENTE);
    expect(rolSegunCorreo('x@gmail.com')).toBeNull();
  });
});

describe('validarContrasena', () => {
  it('rechaza una contraseña corta y dice cuántos caracteres hacen falta', () => {
    expect(validarContrasena('ab1')).toMatch(/8 caracteres/);
  });

  it('rechaza una sin números y lo dice', () => {
    expect(validarContrasena('sololetrasaqui')).toMatch(/números/);
  });

  it('rechaza una sin letras y lo dice', () => {
    expect(validarContrasena('1234567890')).toMatch(/letras/);
  });

  it('junta lo que falta en un solo mensaje', () => {
    const mensaje = validarContrasena('abc');
    expect(mensaje).toMatch(/8 caracteres/);
    expect(mensaje).toMatch(/números/);
  });

  it('no exige símbolos ni mayúsculas', () => {
    expect(validarContrasena('clave1234')).toBeNull();
  });
});

describe('validarRol', () => {
  it('exige elegir un perfil: ninguno viene por omisión', () => {
    expect(validarRol('')).toMatch(/Elige/);
    expect(validarRol(undefined)).not.toBeNull();
  });

  it('rechaza un perfil que no existe', () => {
    expect(validarRol('ADMIN')).not.toBeNull();
  });

  it('acepta los dos perfiles del MVP', () => {
    expect(validarRol(ROLES.ESTUDIANTE)).toBeNull();
    expect(validarRol(ROLES.DOCENTE)).toBeNull();
  });
});

describe('validarRegistro', () => {
  it('un registro correcto no devuelve errores', () => {
    expect(validarRegistro(valido)).toEqual({});
    expect(validarRegistro({
      nombre: 'Carolina Soto',
      correo: 'carolina.soto@duoc.cl',
      password: 'otraClave99',
      rol: ROLES.DOCENTE,
    })).toEqual({});
  });

  it('devuelve un error por campo', () => {
    const errores = validarRegistro({ nombre: 'Camila', correo: 'a@gmail.com', password: 'x', rol: '' });
    expect(Object.keys(errores).sort()).toEqual(['correo', 'nombre', 'password', 'rol']);
  });

  it('@duocuc.cl con perfil Docente es incoherente y se explica sin acusar', () => {
    const errores = validarRegistro({ ...valido, rol: ROLES.DOCENTE });
    expect(errores.rol).toMatch(/@duocuc\.cl.*Estudiante/);
    expect(errores.rol).not.toMatch(/mentir|falso|engañ/i);
    expect(errores.correo).toBeUndefined();
  });

  it('@duoc.cl con perfil Estudiante es incoherente', () => {
    const errores = validarRegistro({ ...valido, correo: 'carolina.soto@duoc.cl' });
    expect(errores.rol).toMatch(/@duoc\.cl.*Docente/);
  });

  it('sin perfil elegido no se apila un segundo error de coherencia', () => {
    const errores = validarRegistro({ ...valido, rol: '' });
    expect(errores.rol).toMatch(/Elige/);
  });

  it('sin argumentos no revienta', () => {
    expect(Object.keys(validarRegistro())).toHaveLength(4);
  });
});
