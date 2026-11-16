import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { authService } from '../../services';
import { ETIQUETAS, ROLES } from '../../utils/constants';
import { rolSegunCorreo, validarRegistro } from '../../utils/registro';
import { rutaInicioDe } from '../../routes/rutas';
import { Aviso, Boton, Campo } from '../../components/ui';

/**
 * Alta de cuenta para los dos perfiles (RF-01).
 *
 * Qué se decidió y por qué:
 *  - El perfil se elige con un grupo de radios, no con una casilla: son dos opciones
 *    excluyentes y ninguna es el valor por omisión, así que hay que obligar a elegir.
 *  - El dominio del correo sugiere el perfil, pero no lo impone. Si al enviar no
 *    coinciden, `validarRegistro` lo explica. Imponerlo en silencio escondería la regla.
 *  - Se valida un campo al salir de él y todos al enviar; nunca al primer carácter.
 *  - Tras registrarse se inicia sesión y se navega de inmediato, sin aviso de éxito: al
 *    guardar la sesión la pantalla se redirige sola, y un aviso que dura un parpadeo no
 *    lo lee nadie ni se anuncia de forma fiable.
 *  - Mientras se envía, el botón queda bloqueado con `aria-disabled` (lo hace `Boton`),
 *    no con `disabled`, para que no salga del orden de tabulación.
 *
 * La contraseña solo viaja hacia el servicio; esta pantalla no la guarda en ningún lado.
 * El hash es cosa del backend (RNF-01).
 */

const PERFILES = [
  {
    rol: ROLES.ESTUDIANTE,
    descripcion: 'Registras tus jornadas, pides correcciones y entregas documentos.',
  },
  {
    rol: ROLES.DOCENTE,
    descripcion: 'Revisas jornadas, autorizas correcciones y publicas documentos.',
  },
];

const VALORES_INICIALES = { nombre: '', correo: '', password: '', rol: '' };

const Registro = () => {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { iniciarSesion, estaAutenticado, usuario } = useAuth();
  const navegar = useNavigate();
  const idLeyenda = useId();
  const idErrorPerfil = useId();
  const idSugerencia = useId();

  // Quien ya tiene sesión no se queda mirando el registro.
  useEffect(() => {
    if (estaAutenticado) navegar(rutaInicioDe(usuario.rol), { replace: true });
  }, [estaAutenticado, usuario, navegar]);

  /** Perfil que le toca al dominio escrito; `null` mientras el correo no es institucional. */
  const rolSugerido = rolSegunCorreo(valores.correo);

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.value;
    setValores((previos) => ({ ...previos, [campo]: valor }));
    limpiarError(campo);
  };

  // Un error ya mostrado se retira al corregir el campo, no se queda hasta el envío.
  const limpiarError = (campo) =>
    setErrores((previos) => (previos[campo] ? { ...previos, [campo]: undefined } : previos));

  const alSalir = (campo) => () => {
    const mensaje = validarRegistro(valores)[campo];
    setErrores((previos) => ({ ...previos, [campo]: mensaje }));
  };

  const elegirRol = (rol) => {
    if (enviando) return;
    setValores((previos) => ({ ...previos, rol }));
    limpiarError('rol');
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    if (enviando) return;
    setErrorGeneral('');

    const encontrados = validarRegistro(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    try {
      setEnviando(true);
      const { usuario: creado, token } = await authService.registrar({
        nombre: valores.nombre.trim(),
        correo: valores.correo.trim(),
        password: valores.password,
        rol: valores.rol,
      });

      iniciarSesion(creado, token);
      navegar(rutaInicioDe(creado.rol), { replace: true });
    } catch (fallo) {
      setErrorGeneral(
        fallo?.mensaje
        ?? fallo?.response?.data?.mensaje
        ?? 'No pudimos crear tu cuenta. Revisa tus datos e inténtalo otra vez.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="ph-registro-contenedor">
      <aside className="ph-registro-presentacion">
        <div className="ph-registro-marca">
          <span className="ph-navbar__sigla" aria-hidden="true">PH</span>
          <span className="ph-registro-marca-texto">PrácticasHub</span>
        </div>

        <h1 className="ph-registro-titular">Tu práctica laboral, con registro y respaldo.</h1>

        <ul className="ph-registro-ventajas">
          <li className="ph-registro-ventaja">
            Registra cada jornada de práctica: fecha, horario, actividad y evidencia.
          </li>
          <li className="ph-registro-ventaja">
            Corrige una jornada ya cerrada solo cuando tu docente lo autoriza.
          </li>
          <li className="ph-registro-ventaja">
            Entrega los documentos que te piden y conserva el historial de sus versiones.
          </li>
        </ul>
      </aside>

      <section className="ph-registro-tarjeta">
        <div className="ph-registro-encabezado">
          <h2 className="ph-registro-titulo">Crear cuenta</h2>
          <p className="ph-registro-bajada">
            Usa tu correo institucional: {ETIQUETAS.ROLES[ROLES.ESTUDIANTE]} con @duocuc.cl y{' '}
            {ETIQUETAS.ROLES[ROLES.DOCENTE]} con @duoc.cl.
          </p>
        </div>

        <div className="ph-registro-avisos" aria-live="polite">
          {errorGeneral && <Aviso tono="error" titulo="No se pudo crear la cuenta">{errorGeneral}</Aviso>}
        </div>

        <form className="ph-registro-formulario" onSubmit={enviar} noValidate>
          <Campo
            className="ph-registro-fila"
            etiqueta="Nombre completo"
            obligatorio
            error={errores.nombre}
          >
            {(atributos) => (
              <input
                {...atributos}
                className="ph-campo__control ph-registro-control"
                type="text"
                autoComplete="name"
                placeholder="Camila Vera Núñez"
                value={valores.nombre}
                onChange={cambiar('nombre')}
                onBlur={alSalir('nombre')}
                readOnly={enviando}
              />
            )}
          </Campo>

          <Campo
            className="ph-registro-fila"
            etiqueta="Correo institucional"
            obligatorio
            error={errores.correo}
          >
            {(atributos) => (
              <input
                {...atributos}
                className="ph-campo__control ph-registro-control"
                type="email"
                autoComplete="email"
                placeholder="nombre.apellido@duocuc.cl"
                value={valores.correo}
                onChange={cambiar('correo')}
                onBlur={alSalir('correo')}
                readOnly={enviando}
              />
            )}
          </Campo>

          <Campo
            className="ph-registro-fila"
            etiqueta="Contraseña"
            obligatorio
            ayuda="Al menos 8 caracteres, con letras y números."
            error={errores.password}
          >
            {(atributos) => (
              <input
                {...atributos}
                className="ph-campo__control ph-registro-control"
                type="password"
                autoComplete="new-password"
                value={valores.password}
                onChange={cambiar('password')}
                onBlur={alSalir('password')}
                readOnly={enviando}
              />
            )}
          </Campo>

          <fieldset
            className="ph-registro-fila ph-registro-perfiles"
            aria-describedby={[
              rolSugerido && valores.rol !== rolSugerido ? idSugerencia : null,
              errores.rol ? idErrorPerfil : null,
            ].filter(Boolean).join(' ') || undefined}
          >
            <legend id={idLeyenda} className="ph-campo__etiqueta ph-registro-leyenda">
              Tu perfil{' '}
              <span className="ph-campo__obligatorio" aria-hidden="true">*</span>
              <span className="ph-solo-lectores">(obligatorio)</span>
            </legend>

            <div className="ph-registro-opciones" role="radiogroup" aria-labelledby={idLeyenda}>
              {PERFILES.map(({ rol, descripcion }) => {
                const seleccionada = valores.rol === rol;
                const clases = [
                  'ph-registro-opcion',
                  seleccionada ? 'ph-registro-opcion--seleccionada' : '',
                  errores.rol ? 'ph-registro-opcion--error' : '',
                  enviando ? 'ph-registro-opcion--bloqueada' : '',
                ].filter(Boolean).join(' ');

                return (
                  <label key={rol} className={clases}>
                    <input
                      className="ph-registro-opcion-radio"
                      type="radio"
                      name="perfil"
                      value={rol}
                      checked={seleccionada}
                      aria-disabled={enviando || undefined}
                      onChange={() => elegirRol(rol)}
                    />
                    <span className="ph-registro-opcion-nombre">{ETIQUETAS.ROLES[rol]}</span>
                    <span className="ph-registro-opcion-detalle">{descripcion}</span>
                  </label>
                );
              })}
            </div>

            <p id={idSugerencia} className="ph-registro-sugerencia" aria-live="polite">
              {rolSugerido && valores.rol !== rolSugerido
                ? `Por tu correo, el perfil que te corresponde es ${ETIQUETAS.ROLES[rolSugerido]}.`
                : ''}
            </p>

            {errores.rol && (
              <span id={idErrorPerfil} className="ph-campo__error ph-registro-error-perfil" role="alert">
                <span aria-hidden="true">⚠</span>
                {errores.rol}
              </span>
            )}
          </fieldset>

          <Boton
            type="submit"
            ancho
            className="ph-registro-enviar"
            bloqueado={enviando}
          >
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </Boton>
        </form>

        <p className="ph-registro-pie">
          <Link className="ph-registro-enlace" to="/login">Ya tengo cuenta</Link>
        </p>
      </section>
    </main>
  );
};

export default Registro;
