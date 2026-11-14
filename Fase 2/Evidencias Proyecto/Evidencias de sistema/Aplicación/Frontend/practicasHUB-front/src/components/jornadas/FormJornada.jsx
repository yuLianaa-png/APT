import { useMemo, useState } from 'react';
import { Aviso, Boton, Campo } from '../ui';
import { CampoArchivo } from '../archivos';
import { calcularHoras, formatearHoras, validarDuracion } from '../../utils/horas';
import { esFechaValida, fechaRepetida, formatearFecha } from '../../utils/fechas';

// Formulario de registro de jornada, con fecha, horario, descanso, actividad principal, descripción y evidencia. Se usa para crear o corregir una jornada.

const FormJornada = ({
  valorInicial = null,
  jornadasDelGrupo = [],
  idExcluido = null,
  fechaBloqueada = false,
  motivoFechaBloqueada = null,
  etiquetaEnvio = 'Continuar',
  enCurso = false,
  errorServicio = null,
  alEnviar,
  alCancelar,
  extra = null,
}) => {
  const [campos, setCampos] = useState(() => ({
    fecha: valorInicial?.fecha ?? '',
    horaInicio: valorInicial?.horaInicio ?? '',
    horaTermino: valorInicial?.horaTermino ?? '',
    descansoMin: String(valorInicial?.descansoMin ?? 0),
    actividadPrincipal: valorInicial?.actividadPrincipal ?? '',
    descripcion: valorInicial?.descripcion ?? '',
    evidencia: valorInicial?.evidencia ?? null,
  }));
  const [errores, setErrores] = useState({});

  const cambiar = (clave) => (evento) => {
    setCampos((previo) => ({ ...previo, [clave]: evento.target.value }));
    setErrores((previo) => ({ ...previo, [clave]: null }));
  };

  /** Cálculo en vivo: se ve el total mientras se escribe, antes de intentar guardar. */
  const calculo = useMemo(() => {
    const horas = calcularHoras(campos.horaInicio, campos.horaTermino, Number(campos.descansoMin) || 0);
    const validez = validarDuracion(campos.horaInicio, campos.horaTermino, Number(campos.descansoMin) || 0);
    return { horas, validez };
  }, [campos.horaInicio, campos.horaTermino, campos.descansoMin]);

  const validar = () => {
    const nuevos = {};

    if (!campos.fecha) {
      nuevos.fecha = 'Indica la fecha de la jornada.';
    } else if (!esFechaValida(campos.fecha)) {
      nuevos.fecha = 'Esa fecha no existe en el calendario.';
    } else if (!fechaBloqueada && fechaRepetida(campos.fecha, jornadasDelGrupo, idExcluido)) {
      // RN-09 y §4.17. Se dice qué fecha choca, no un «fecha inválida» genérico.
      nuevos.fecha = `Ya registraste una jornada el ${formatearFecha(campos.fecha)} en esta práctica. Puedes usar esa fecha en otra práctica, pero no dos veces en la misma.`;
    }

    if (!campos.actividadPrincipal.trim()) {
      nuevos.actividadPrincipal = 'Indica qué hiciste principalmente en la jornada.';
    }

    if (!calculo.validez.valido) {
      // El mensaje de RN-08 se enseña en el campo que lo provoca.
      const esDescanso = /descanso/i.test(calculo.validez.mensaje);
      nuevos[esDescanso ? 'descansoMin' : 'horaTermino'] = calculo.validez.mensaje;
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const enviar = (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    alEnviar({
      fecha: campos.fecha,
      horaInicio: campos.horaInicio,
      horaTermino: campos.horaTermino,
      descansoMin: Number(campos.descansoMin) || 0,
      actividadPrincipal: campos.actividadPrincipal.trim(),
      descripcion: campos.descripcion.trim() || null,
      evidencia: campos.evidencia,
      horas: calculo.horas,
    });
  };

  return (
    <form className="ph-jornada-form" onSubmit={enviar} noValidate>
      <div className="ph-jornada-form__campos ph-pila">
        {errorServicio && (
          <Aviso tono="error" titulo="No se pudo guardar">{errorServicio}</Aviso>
        )}

        <Campo
          etiqueta="Fecha"
          obligatorio
          error={errores.fecha}
          ayuda={fechaBloqueada ? motivoFechaBloqueada : 'Una fecha solo puede usarse una vez en esta práctica.'}
        >
          {(atributos) => (
            <input
              {...atributos}
              className={`ph-campo__control${errores.fecha ? ' ph-campo__control--error' : ''}`}
              type="date"
              value={campos.fecha}
              onChange={cambiar('fecha')}
              readOnly={fechaBloqueada}
              disabled={enCurso}
            />
          )}
        </Campo>

        <div className="ph-jornada-form__horario">
          <Campo etiqueta="Hora de inicio" obligatorio>
            {(atributos) => (
              <input
                {...atributos}
                className="ph-campo__control"
                type="time"
                value={campos.horaInicio}
                onChange={cambiar('horaInicio')}
                disabled={enCurso}
              />
            )}
          </Campo>

          <Campo etiqueta="Hora de término" obligatorio error={errores.horaTermino}>
            {(atributos) => (
              <input
                {...atributos}
                className={`ph-campo__control${errores.horaTermino ? ' ph-campo__control--error' : ''}`}
                type="time"
                value={campos.horaTermino}
                onChange={cambiar('horaTermino')}
                disabled={enCurso}
              />
            )}
          </Campo>

          <Campo
            etiqueta="Descanso"
            error={errores.descansoMin}
            ayuda="En minutos."
          >
            {(atributos) => (
              <input
                {...atributos}
                className={`ph-campo__control${errores.descansoMin ? ' ph-campo__control--error' : ''}`}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={campos.descansoMin}
                onChange={cambiar('descansoMin')}
                disabled={enCurso}
              />
            )}
          </Campo>
        </div>

        <Campo etiqueta="Actividad principal" obligatorio error={errores.actividadPrincipal}>
          {(atributos) => (
            <input
              {...atributos}
              className={`ph-campo__control${errores.actividadPrincipal ? ' ph-campo__control--error' : ''}`}
              placeholder="Pruebas funcionales del módulo de usuarios"
              value={campos.actividadPrincipal}
              onChange={cambiar('actividadPrincipal')}
              disabled={enCurso}
            />
          )}
        </Campo>

        <Campo etiqueta="Descripción" ayuda="Opcional. Detalle de lo que hiciste.">
          {(atributos) => (
            <textarea
              {...atributos}
              className="ph-campo__control"
              value={campos.descripcion}
              onChange={cambiar('descripcion')}
              disabled={enCurso}
            />
          )}
        </Campo>

        <CampoArchivo
          etiqueta="Evidencia"
          ayuda="Opcional. Un respaldo de la jornada: informe, captura o documento. Hasta 40 MB."
          valor={campos.evidencia}
          alCambiar={(archivo) => setCampos((previo) => ({ ...previo, evidencia: archivo }))}
        />

        {extra}

        <div className="ph-fila">
          <Boton type="submit" disabled={enCurso}>
            {enCurso ? 'Guardando…' : etiquetaEnvio}
          </Boton>
          <Boton variante="secundario" onClick={alCancelar} disabled={enCurso}>
            Cancelar
          </Boton>
        </div>
      </div>

      {/* Tarjeta de cálculo: el total es un resultado, nunca un campo. */}
      <aside className="ph-jornada-form__calculo">
        <h2 className="ph-tarjeta__titulo">Horas de la jornada</h2>

        <p className="ph-jornada-form__total">
          {calculo.validez.valido ? `${formatearHoras(calculo.horas)} h` : '—'}
        </p>

        <dl className="ph-jornada-form__desglose">
          <div>
            <dt>Horario</dt>
            <dd>
              {campos.horaInicio && campos.horaTermino
                ? `${campos.horaInicio} a ${campos.horaTermino}`
                : 'Sin indicar'}
            </dd>
          </div>
          <div>
            <dt>Descanso</dt>
            <dd>{`${Number(campos.descansoMin) || 0} min`}</dd>
          </div>
        </dl>

        {!calculo.validez.valido && campos.horaInicio && campos.horaTermino && (
          <Aviso tono="espera">{calculo.validez.mensaje}</Aviso>
        )}

        <p className="ph-campo__ayuda">
          El total lo calcula el sistema: término menos inicio, menos el descanso. No se
          escribe a mano y no hay máximo de horas por jornada.
        </p>
      </aside>
    </form>
  );
};

export default FormJornada;
