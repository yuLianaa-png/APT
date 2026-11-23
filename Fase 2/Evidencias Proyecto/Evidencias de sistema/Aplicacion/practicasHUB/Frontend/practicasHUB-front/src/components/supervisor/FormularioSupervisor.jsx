import { useState } from 'react';
import { Aviso, Boton, Campo } from '../ui';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CAMPOS = [
  { clave: 'nombre', etiqueta: 'Nombre y apellido', maximo: 120, tipo: 'text', autocompletar: 'name' },
  { clave: 'cargo', etiqueta: 'Cargo', maximo: 100, tipo: 'text', autocompletar: 'organization-title' },
  { clave: 'empresa', etiqueta: 'Empresa o institución', maximo: 150, tipo: 'text', autocompletar: 'organization' },
  { clave: 'correo', etiqueta: 'Correo electrónico', maximo: 150, tipo: 'email', autocompletar: 'email' },
];

/** Mensaje de error de cada campo, o un objeto vacío si todo está bien. */
const validar = (valores) => {
  const errores = {};
  if (valores.nombre.trim().length < 3) errores.nombre = 'Escribe el nombre y apellido del supervisor.';
  if (valores.cargo.trim().length < 2) errores.cargo = 'Escribe el cargo del supervisor.';
  if (valores.empresa.trim().length < 2) errores.empresa = 'Escribe la empresa o institución.';
  if (!CORREO.test(valores.correo.trim())) errores.correo = 'Escribe un correo válido, por ejemplo nombre@empresa.cl.';
  return errores;
};

// Formulario con los datos del supervisor del centro de práctica. Lo usan el estudiante
// (al registrarlo) y el docente (al corregirlo).

const FormularioSupervisor = ({ inicial, alGuardar, alCancelar = null, enCurso = false, errorServicio = null }) => {
  const [valores, setValores] = useState({
    nombre: inicial?.nombre ?? '',
    cargo: inicial?.cargo ?? '',
    empresa: inicial?.empresa ?? '',
    correo: inicial?.correo ?? '',
  });
  const [errores, setErrores] = useState({});

  const cambiar = (clave, valor) => {
    setValores((previo) => ({ ...previo, [clave]: valor }));
    setErrores((previo) => ({ ...previo, [clave]: null }));
  };

  const enviar = (evento) => {
    evento.preventDefault();
    const encontrados = validar(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    alGuardar({
      nombre: valores.nombre.trim(),
      cargo: valores.cargo.trim(),
      empresa: valores.empresa.trim(),
      correo: valores.correo.trim().toLowerCase(),
    });
  };

  return (
    <form className="ph-pila" onSubmit={enviar} noValidate>
      {errorServicio && <Aviso tono="error" titulo="No se pudo guardar">{errorServicio}</Aviso>}

      <div className="ph-rejilla-dos">
        {CAMPOS.map((campo) => (
          <Campo key={campo.clave} etiqueta={campo.etiqueta} obligatorio error={errores[campo.clave]}>
            {(atributos) => (
              <input
                {...atributos}
                type={campo.tipo}
                autoComplete={campo.autocompletar}
                maxLength={campo.maximo}
                className={`ph-campo__control${errores[campo.clave] ? ' ph-campo__control--error' : ''}`}
                value={valores[campo.clave]}
                onChange={(evento) => cambiar(campo.clave, evento.target.value)}
                disabled={enCurso}
              />
            )}
          </Campo>
        ))}
      </div>

      <div className="ph-fila">
        <Boton type="submit" disabled={enCurso}>{enCurso ? 'Guardando…' : 'Guardar supervisor'}</Boton>
        {alCancelar && (
          <Boton variante="secundario" onClick={alCancelar} disabled={enCurso}>Cancelar</Boton>
        )}
      </div>
    </form>
  );
};

export default FormularioSupervisor;
