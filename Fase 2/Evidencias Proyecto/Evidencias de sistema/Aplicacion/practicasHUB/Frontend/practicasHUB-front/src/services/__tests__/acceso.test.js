import { beforeEach, describe, expect, it } from 'vitest';
import { listar, reiniciar } from '../mock/db';
import { reiniciarReloj } from '../mock/reloj';
import { authMock } from '../mock/auth.mock';
import { archivoMock } from '../mock/archivo.mock';
import { ERRORES, ROLES } from '../../utils/constants';

/// Función auxiliar para capturar el error de una promesa que se espera que falle.

const errorDe = async (promesa) => {
  try {
    await promesa;
    throw new Error('Se esperaba un fallo y la operación tuvo éxito.');
  } catch (error) {
    return error;
  }
};

beforeEach(() => {
  reiniciarReloj();
  reiniciar();
});

describe('login (RF-01, §3)', () => {
  it('entra un estudiante de la semilla', async () => {
    const { usuario, token } = await authMock.login('nicolas.fernandez@duocuc.cl', 'loquesea');
    expect(usuario.rol).toBe(ROLES.ESTUDIANTE);
    expect(token).toBeTruthy();
  });

  it('entra un docente', async () => {
    const { usuario } = await authMock.login('carolina.soto@duoc.cl', 'loquesea');
    expect(usuario.rol).toBe(ROLES.DOCENTE);
  });

  it('el correo no distingue mayúsculas ni espacios sobrantes', async () => {
    const { usuario } = await authMock.login('  Carolina.Soto@DUOC.cl ', 'loquesea');
    expect(usuario.id).toBe('doc_1');
  });

  it('rechaza un correo que no existe', async () => {
    const error = await errorDe(authMock.login('nadie@duocuc.cl', 'loquesea'));
    expect(error.codigo).toBe(ERRORES.NO_AUTORIZADO);
  });

  it('rechaza campos vacíos', async () => {
    expect((await errorDe(authMock.login('', 'x'))).codigo).toBe(ERRORES.NO_AUTORIZADO);
    expect((await errorDe(authMock.login('nicolas.fernandez@duocuc.cl', ''))).codigo)
      .toBe(ERRORES.NO_AUTORIZADO);
  });

  it('el mensaje no revela si el correo existe o si falló la contraseña', async () => {
    const correoInexistente = await errorDe(authMock.login('nadie@duocuc.cl', 'x'));
    expect(correoInexistente.mensaje).not.toMatch(/no existe|no registrad/i);
  });

  it('el perfil se recupera desde el token', async () => {
    const { token } = await authMock.login('nicolas.fernandez@duocuc.cl', 'x');
    const usuario = await authMock.perfil(token);
    expect(usuario.correo).toBe('nicolas.fernandez@duocuc.cl');
  });

  it('un token inventado no devuelve perfil', async () => {
    expect((await errorDe(authMock.perfil('cualquier.cosa.aqui'))).codigo)
      .toBe(ERRORES.NO_AUTORIZADO);
  });

  it('solo existen los dos perfiles del MVP', async () => {
    const cuentas = await authMock.cuentasDisponibles();
    const roles = new Set(cuentas.map((cuenta) => cuenta.rol));
    expect([...roles].sort()).toEqual([ROLES.DOCENTE, ROLES.ESTUDIANTE].sort());
  });
});

describe('subida de archivos (RNF-08)', () => {
  const archivo = (name, type, size) => ({ name, type, size });

  it('registra el metadato y devuelve un ArchivoRef', async () => {
    const referencia = await archivoMock.subir(
      archivo('informe.pdf', 'application/pdf', 2048),
    );
    expect(referencia.id).toMatch(/^arc_/);
    expect(referencia.nombre).toBe('informe.pdf');
    expect(referencia.extension).toBe('pdf');
    expect(referencia.tamanoBytes).toBe(2048);
  });

  it('el servicio valida otra vez, aunque el formulario ya lo hiciera', async () => {
    const error = await errorDe(archivoMock.subir(archivo('virus.exe', '', 100)));
    expect(error.codigo).toBe(ERRORES.ARCHIVO_INVALIDO);
  });

  it('rechaza un archivo de más de 40 MB', async () => {
    const error = await errorDe(
      archivoMock.subir(archivo('enorme.pdf', 'application/pdf', 45 * 1024 * 1024)),
    );
    expect(error.mensaje).toMatch(/40 MB/);
  });

  it('un archivo rechazado no queda registrado', async () => {
    await errorDe(archivoMock.subir(archivo('clip.mp4', 'video/mp4', 100)));
    const { volcar } = await import('../mock/db');
    expect(volcar().archivos.some((a) => a.nombre === 'clip.mp4')).toBe(false);
  });
});

describe('registrar (RF-01)', () => {
  const datos = {
    nombre: 'Valentina Rojas Mena',
    correo: 'valentina.rojas@duocuc.cl',
    password: 'clave-de-prueba-1',
    rol: ROLES.ESTUDIANTE,
  };

  it('rechaza un correo que ya tiene cuenta, sin importar mayúsculas', async () => {
    const error = await errorDe(authMock.registrar({ ...datos, correo: 'Nicolas.Fernandez@duocuc.cl' }));
    expect(error.codigo).toBe(ERRORES.NO_AUTORIZADO);
    expect(error.mensaje).toMatch(/ya tiene una cuenta/i);
    expect(error.mensaje).not.toMatch(/Nicolás|ESTUDIANTE/);
  });

  it('rechaza datos que no pasan las reglas, como un dominio ajeno', async () => {
    const error = await errorDe(authMock.registrar({ ...datos, correo: 'vale@gmail.com' }));
    expect(error.codigo).toBe(ERRORES.NO_AUTORIZADO);
    expect(listar('usuarios').some((u) => u.correo === 'vale@gmail.com')).toBe(false);
  });

  it('crea el usuario, devuelve la forma de login y no guarda la contraseña en ningún sitio', async () => {
    const { usuario, token } = await authMock.registrar(datos);

    expect(usuario).toMatchObject({ nombre: datos.nombre, correo: datos.correo, rol: ROLES.ESTUDIANTE });
    expect(token).toBeTruthy();

    const guardado = listar('usuarios').find((u) => u.id === usuario.id);
    expect(guardado).toEqual(usuario);
    expect(Object.keys(guardado).sort()).toEqual(['correo', 'id', 'nombre', 'rol']);
    expect(JSON.stringify(listar('usuarios'))).not.toContain(datos.password);

    // Con ese token se puede pedir el perfil, igual que tras un login.
    expect((await authMock.perfil(token)).id).toBe(usuario.id);
  });
});
