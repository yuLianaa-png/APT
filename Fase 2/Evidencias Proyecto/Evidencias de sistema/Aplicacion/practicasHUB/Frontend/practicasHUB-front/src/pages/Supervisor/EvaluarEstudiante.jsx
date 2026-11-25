import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { evaluacionPublicaService } from '../../services';
import { formatearInstante } from '../../utils/fechas';
import { respuestasVacias, validarRespuestas } from '../../utils/pauta';
import { Aviso, Boton, Cargando, EstadoError } from '../../components/ui';
import { FormularioEvaluacion } from '../../components/pauta';

// Página pública donde el supervisor llena la pauta de evaluación. Se abre desde el enlace del
// correo, sin iniciar sesión. No se puede enviar con campos vacíos: se revisa aquí y en el servidor.

const EvaluarEstudiante = () => {
  const { token } = useParams();
  const [estado, setEstado] = useState({ vista: null, cargando: true, error: null });
  const [respuestas, setRespuestas] = useState([]);
  const [errores, setErrores] = useState({ lista: [], porCampo: {} });
  const [envio, setEnvio] = useState({ enCurso: false, error: null });
  const resumenErrores = useRef(null);

  const cargar = useCallback(() => {
    let vigente = true;
    evaluacionPublicaService.ver(token)
      .then((vista) => {
        if (!vigente) return;
        setEstado({ vista, cargando: false, error: null });
        if (vista.pauta) setRespuestas(respuestasVacias(vista.pauta.secciones));
      })
      .catch((fallo) => {
        if (vigente) setEstado({ vista: null, cargando: false, error: fallo?.mensaje ?? 'No se pudo abrir el enlace.' });
      });
    return () => { vigente = false; };
  }, [token]);

  useEffect(() => cargar(), [cargar]);

  if (estado.cargando) return <main className="ph-publica"><Cargando mensaje="Abriendo la evaluación…" /></main>;
  if (estado.error) {
    return (
      <main className="ph-publica ph-pila">
        <Marca />
        <EstadoError titulo="No se pudo abrir el enlace" mensaje={estado.error} />
      </main>
    );
  }

  const { vista } = estado;

  if (vista.enviada) {
    return (
      <main className="ph-publica ph-pila">
        <Marca />
        <Aviso tono="exito" titulo="¡Gracias! La evaluación ya fue enviada">
          {`Recibimos la ${vista.etiqueta.toLowerCase()} de ${vista.estudiante}${vista.enviadaEn ? ` el ${formatearInstante(vista.enviadaEn)}` : ''}. `}
          Si necesitas corregir algo, escríbele al docente del curso.
        </Aviso>
      </main>
    );
  }

  const cambiar = (nuevas) => {
    setRespuestas(nuevas);
    // Los errores se recalculan en vivo solo después del primer intento de envío.
    if (errores.lista.length > 0) setErrores(validarRespuestas(vista.pauta.secciones, nuevas));
  };

  const enviar = () => {
    const encontrados = validarRespuestas(vista.pauta.secciones, respuestas);
    setErrores(encontrados);
    if (encontrados.lista.length > 0) {
      setEnvio({ enCurso: false, error: null });
      resumenErrores.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEnvio({ enCurso: true, error: null });
    evaluacionPublicaService.enviar(token, respuestas)
      .then((nueva) => {
        setEstado({ vista: nueva, cargando: false, error: null });
        setEnvio({ enCurso: false, error: null });
        window.scrollTo?.(0, 0);
      })
      .catch((fallo) => setEnvio({ enCurso: false, error: fallo?.mensaje ?? 'No se pudo enviar la evaluación.' }));
  };

  return (
    <main className="ph-publica ph-pila">
      <Marca />
      <div>
        <h1 className="ph-publica__titulo">{vista.etiqueta}</h1>
        <p className="ph-tarjeta__apoyo">
          {`${vista.estudiante} · ${vista.empresa}${vista.practica ? ` · ${vista.practica}` : ''}`}
        </p>
      </div>

      {vista.soloLectura ? (
        <Aviso titulo="La práctica ya está cerrada">Ya no se pueden enviar evaluaciones para esta práctica.</Aviso>
      ) : (
        <>
          {vista.pauta.instrucciones && (
            <Aviso titulo="Instrucciones">
              <span className="ph-evaluacion__respuesta">{vista.pauta.instrucciones}</span>
            </Aviso>
          )}
          <p className="ph-campo__ayuda">
            {`Todos los campos son obligatorios. Las notas van de 1 a 7. Este enlace es personal y vence el ${formatearInstante(vista.venceEn)}.`}
          </p>

          <FormularioEvaluacion
            secciones={vista.pauta.secciones}
            respuestas={respuestas}
            alCambiar={cambiar}
            errores={errores.porCampo}
          />

          <div className="ph-publica__pie ph-pila" ref={resumenErrores}>
            {errores.lista.length > 0 && (
              <Aviso tono="error" titulo={`Faltan ${errores.lista.length} ${errores.lista.length === 1 ? 'campo' : 'campos'} por completar`}>
                <ul className="ph-editor-pauta__errores">
                  {errores.lista.slice(0, 6).map((error) => <li key={error}>{error}</li>)}
                </ul>
                {errores.lista.length > 6 && <span className="ph-campo__ayuda">{`…y ${errores.lista.length - 6} más.`}</span>}
              </Aviso>
            )}
            {envio.error && <Aviso tono="error" titulo="No se pudo enviar">{envio.error}</Aviso>}
            <Boton ancho onClick={enviar} disabled={envio.enCurso}>
              {envio.enCurso ? 'Enviando…' : 'Enviar evaluación'}
            </Boton>
          </div>
        </>
      )}
    </main>
  );
};

const Marca = () => (
  <div className="ph-acceso__marca">
    <span className="ph-navbar__sigla" aria-hidden="true">PH</span>
    <span className="ph-acceso__marca-texto">PrácticasHub</span>
  </div>
);

export default EvaluarEstudiante;
