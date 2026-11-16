import { ROLES } from './constants';

/**
 * Reglas del formulario de registro (RF-01).
 *
 * Viven aquí, como funciones puras, porque el proyecto no tiene pruebas de componentes:
 * lo que se puede validar sin React se prueba con Vitest. Cada función devuelve `null` si
 * el valor sirve, o el mensaje que se le muestra a la persona.
 *
 * Son validaciones de forma para ayudar a quien escribe. La autoridad es el backend:
 * vuelve a validar todo y es el único que guarda un hash (BCrypt, RNF-01).
 */

/** Dominios institucionales y el perfil que le corresponde a cada uno. */
export const DOMINIO_ESTUDIANTE = '@duocuc.cl';
export const DOMINIO_DOCENTE = '@duoc.cl';

export const MAX_NOMBRE = 120;
export const MIN_CONTRASENA = 8;

const normalizar = (texto) => String(texto ?? '').trim().toLowerCase();

// Forma mínima: algo, una arroba, algo con punto. La prueba real de que el correo sirve
// es que el dominio sea institucional, no una expresión regular más rebuscada.
const FORMA_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Una palabra de nombre: empieza con letra (tildes y ñ incluidas) y admite apóstrofo,
// guion o punto después (O'Higgins, Pérez-Cotapos, «M.» de un apellido abreviado).
const PALABRA_NOMBRE = /^\p{L}[\p{L}'’.-]*$/u;

/** Nombre y apellido: al menos dos palabras de dos o más caracteres, con letras. */
export const validarNombre = (nombre) => {
  const limpio = String(nombre ?? '').trim().replace(/\s+/g, ' ');
  if (!limpio) return 'Escribe tu nombre completo.';
  if (limpio.length > MAX_NOMBRE) return `Tu nombre no puede pasar de ${MAX_NOMBRE} caracteres.`;

  const palabras = limpio.split(' ');
  const validas = palabras.filter((palabra) => palabra.length >= 2 && PALABRA_NOMBRE.test(palabra));
  if (validas.length < 2 || validas.length !== palabras.length) {
    return 'Escribe tu nombre y tu apellido, con letras (por ejemplo, «Camila Vera»).';
  }
  return null;
};

/** Perfil que corresponde al dominio del correo; `null` si no es institucional. */
export const rolSegunCorreo = (correo) => {
  const limpio = normalizar(correo);
  if (!FORMA_CORREO.test(limpio)) return null;
  if (limpio.endsWith(DOMINIO_ESTUDIANTE)) return ROLES.ESTUDIANTE;
  if (limpio.endsWith(DOMINIO_DOCENTE)) return ROLES.DOCENTE;
  return null;
};

/** Correo con forma válida y de dominio institucional. */
export const validarCorreo = (correo) => {
  const limpio = normalizar(correo);
  if (!limpio) return 'Escribe tu correo institucional.';
  if (!FORMA_CORREO.test(limpio)) {
    return 'Escribe un correo con formato válido, como nombre.apellido@duocuc.cl.';
  }
  if (!rolSegunCorreo(limpio)) {
    return `Solo se admiten correos institucionales: ${DOMINIO_ESTUDIANTE} para estudiantes o ${DOMINIO_DOCENTE} para docentes.`;
  }
  return null;
};

/**
 * Mínimo 8 caracteres con letras y números. No se exigen símbolos ni mayúsculas: ASVS
 * prefiere el largo a las reglas de composición, que empujan a contraseñas predecibles.
 * No se recorta la contraseña: los espacios cuentan.
 */
export const validarContrasena = (password) => {
  const texto = String(password ?? '');
  if (!texto) return 'Escribe una contraseña.';

  const faltas = [];
  if (texto.length < MIN_CONTRASENA) faltas.push(`tener al menos ${MIN_CONTRASENA} caracteres`);
  if (!/\p{L}/u.test(texto)) faltas.push('incluir letras');
  if (!/\d/.test(texto)) faltas.push('incluir números');

  if (faltas.length === 0) return null;
  return `La contraseña debe ${faltas.join(' y ')}.`;
};

/** Uno de los dos perfiles del MVP. */
export const validarRol = (rol) => {
  if (!rol) return 'Elige tu perfil: estudiante o docente.';
  if (!Object.values(ROLES).includes(rol)) return 'El perfil elegido no es válido.';
  return null;
};

/**
 * Valida el formulario entero. Devuelve `{ campo: mensaje }`, vacío si todo está bien.
 *
 * La coherencia entre dominio y perfil se comprueba solo cuando correo y perfil son
 * válidos por separado: si no, se apilarían dos errores por la misma causa. El mensaje
 * explica la regla (cada dominio corresponde a un perfil) sin suponer mala fe.
 */
export const validarRegistro = ({ nombre, correo, password, rol } = {}) => {
  const errores = {};

  const errorNombre = validarNombre(nombre);
  if (errorNombre) errores.nombre = errorNombre;

  const errorCorreo = validarCorreo(correo);
  if (errorCorreo) errores.correo = errorCorreo;

  const errorContrasena = validarContrasena(password);
  if (errorContrasena) errores.password = errorContrasena;

  const errorRol = validarRol(rol);
  if (errorRol) errores.rol = errorRol;

  if (!errorCorreo && !errorRol && rolSegunCorreo(correo) !== rol) {
    errores.rol = rol === ROLES.DOCENTE
      ? `Los correos ${DOMINIO_ESTUDIANTE} corresponden al perfil Estudiante. Si eres docente, usa tu correo ${DOMINIO_DOCENTE}.`
      : `Los correos ${DOMINIO_DOCENTE} corresponden al perfil Docente. Si eres estudiante, usa tu correo ${DOMINIO_ESTUDIANTE}.`;
  }

  return errores;
};
