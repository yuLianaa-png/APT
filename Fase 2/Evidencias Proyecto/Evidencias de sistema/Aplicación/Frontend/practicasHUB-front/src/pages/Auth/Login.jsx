import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { authService, USAR_MOCKS } from '../../services';
import { ETIQUETAS, ROLES } from '../../utils/constants';
import { rutaInicioDe } from '../../routes/rutas';
import { Aviso, Boton, Campo } from '../../components/ui';

/**
 * Acceso común a los dos perfiles (§3 del manual, RF-01).
 *
 * El inicio de sesión es uno solo: no hay dos formularios ni un selector de perfil. La
 * autenticación identifica el perfil autorizado y abre el Dashboard general que le
 * corresponde — el Dashboard, no una vista interna: ambos empiezan fuera de cualquier
 * grupo (RN-04).
 *
 * Qué cambió respecto del prototipo: comparaba el rol con `ROLES.SUPERVISOR`, que ya no
 * existe, así que todo inicio de sesión acababa en «rol no válido». Ahora la ruta de
 * destino sale de `rutaInicioDe`, y si el perfil no es uno de los dos del MVP se dice
 * claramente en lugar de dejar a la persona en una pantalla en blanco.
 *
 * El mensaje de error nunca distingue entre «ese correo no existe» y «la contraseña no
 * es esa»: decirlo confirmaría qué correos están registrados.
 */
const Login = () => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cuentasDemo, setCuentasDemo] = useState([]);

  const { iniciarSesion, estaAutenticado, usuario } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  /** A dónde iba antes de que la puerta lo mandara aquí (§3). */
  const destinoPrevio = ubicacion.state?.desde ?? null;

  // Quien ya tiene sesión no se queda mirando el login.
  useEffect(() => {
    if (estaAutenticado) navegar(rutaInicioDe(usuario.rol), { replace: true });
  }, [estaAutenticado, usuario, navegar]);

  // Con datos simulados, la lista de correos de prueba evita tener que ir a buscarlos a
  // la semilla. Solo en ese modo: con backend real no se enseña ninguna cuenta.
  useEffect(() => {
    if (!USAR_MOCKS) return;
    authService.cuentasDisponibles?.().then(setCuentasDemo).catch(() => setCuentasDemo([]));
  }, []);

  const enviar = async (evento) => {
    evento.preventDefault();
    setError('');

    if (!correo.trim() || !contrasena) {
      setError('Ingresa tu correo y tu contraseña.');
      return;
    }

    try {
      setEnviando(true);
      const { usuario: autenticado, token } = await authService.login(correo.trim(), contrasena);

      if (autenticado?.rol !== ROLES.ESTUDIANTE && autenticado?.rol !== ROLES.DOCENTE) {
        setError('Tu cuenta no tiene un perfil con acceso a PrácticasHub. Avisa a tu docente responsable.');
        return;
      }

      iniciarSesion(autenticado, token);
      navegar(destinoPrevio ?? rutaInicioDe(autenticado.rol), { replace: true });
    } catch (fallo) {
      setError(
        fallo?.mensaje
        ?? fallo?.response?.data?.mensaje
        ?? 'No pudimos iniciar sesión con esos datos. Revísalos e inténtalo otra vez.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="ph-acceso">
      {/* Panel izquierdo: presentación */}
      <section className="ph-acceso__presentacion">
        <div className="ph-acceso__marca">
          <span className="ph-navbar__sigla" aria-hidden="true">PH</span>
          <span className="ph-acceso__marca-texto">PrácticasHub</span>
        </div>

        <div className="ph-acceso__discurso">
          <h1 className="ph-acceso__titular">
            El seguimiento de tu práctica, en un solo lugar.
          </h1>
          <p className="ph-acceso__bajada">
            Registra jornadas y horas, adjunta evidencias, gestiona documentos y entregas,
            y mantén la trazabilidad entre estudiantes y docentes.
          </p>
        </div>

        <p className="ph-acceso__pie">
          Plataforma de seguimiento de práctica laboral y profesional.
        </p>
      </section>

      {/* Panel derecho: formulario */}
      <section className="ph-acceso__formulario">
        <div className="ph-tarjeta ph-acceso__tarjeta">
          <div className="ph-pila">
            <h2>Iniciar sesión</h2>
            <p className="ph-tarjeta__apoyo">
              Usa tu correo institucional. El mismo acceso sirve para estudiantes y docentes.
            </p>
          </div>

          {destinoPrevio && !error && (
            <Aviso tono="espera">
              Para abrir esa página necesitas haber iniciado sesión.
            </Aviso>
          )}

          {error && <Aviso tono="error" titulo="No se pudo entrar">{error}</Aviso>}

          <form className="ph-pila" onSubmit={enviar} noValidate>
            <Campo etiqueta="Correo institucional" obligatorio>
              {(atributos) => (
                <input
                  {...atributos}
                  className="ph-campo__control"
                  type="email"
                  autoComplete="username"
                  placeholder="nombre.apellido@duocuc.cl"
                  value={correo}
                  onChange={(evento) => setCorreo(evento.target.value)}
                  disabled={enviando}
                />
              )}
            </Campo>

            <Campo etiqueta="Contraseña" obligatorio>
              {(atributos) => (
                <input
                  {...atributos}
                  className="ph-campo__control"
                  type="password"
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(evento) => setContrasena(evento.target.value)}
                  disabled={enviando}
                />
              )}
            </Campo>

            <Boton type="submit" ancho disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </Boton>
          </form>

          <p className="ph-campo__ayuda">
            ¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link>
          </p>

          {USAR_MOCKS && cuentasDemo.length > 0 && (
            <div className="ph-acceso__demo">
              <p className="ph-campo__ayuda">
                <strong>Datos simulados.</strong> No hay backend todavía: entra con
                cualquiera de estos correos y la contraseña que quieras.
              </p>
              <ul className="ph-acceso__cuentas">
                {cuentasDemo.map((cuenta) => (
                  <li key={cuenta.id}>
                    <button
                      type="button"
                      className="ph-acceso__cuenta"
                      onClick={() => setCorreo(cuenta.correo)}
                    >
                      <span>{cuenta.correo}</span>
                      <span className="ph-insignia">{ETIQUETAS.ROLES[cuenta.rol]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Login;
