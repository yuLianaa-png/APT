import { useState } from 'react';
import { Aviso, Boton, Campo, Modal } from '../../components/ui';
import VistaPreviaGrupo from '../../components/grupo/VistaPreviaGrupo';
import { useAuth } from '../../context/useAuth';
import { vinculacionService } from '../../services';

// Componente para vincularse a un grupo mediante un código. Se usa en `EstudianteDashboard` y en `VincularGrupoModal`.

const VincularGrupo = ({ alVincular, alCerrar }) => {
  const { usuario } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [paso, setPaso] = useState('codigo');
  const [grupo, setGrupo] = useState(null);
  const [error, setError] = useState(null);
  const [enCurso, setEnCurso] = useState(false);

  const consultar = async (evento) => {
    evento.preventDefault();
    setError(null);

    if (!codigo.trim()) {
      setError('Ingresa el código que te dio tu docente.');
      return;
    }

    setEnCurso(true);
    try {
      const encontrado = await vinculacionService.previsualizarCodigo(codigo, usuario.id);
      setGrupo(encontrado);
      setPaso('revision');
    } catch (fallo) {
      // El código escrito NO se borra: §4.16 pide poder corregirlo.
      setError(fallo?.mensaje ?? 'No se pudo comprobar el código.');
    } finally {
      setEnCurso(false);
    }
  };

  const confirmar = async () => {
    setEnCurso(true);
    setError(null);
    try {
      const resultado = await vinculacionService.vincular(codigo, usuario.id);
      alVincular(resultado.grupo);
    } catch (fallo) {
      setError(fallo?.mensaje ?? 'No se pudo completar la vinculación.');
      setPaso('codigo');
    } finally {
      setEnCurso(false);
    }
  };

  if (paso === 'revision' && grupo) {
    return (
      <Modal
        titulo="¿Es esta tu práctica?"
        apoyo="Revisa los datos antes de confirmar. La vinculación se crea solo al confirmar."
        alCerrar={alCerrar}
        cerrarAlPulsarFuera={false}
        pie={(
          <>
            <Boton
              variante="secundario"
              onClick={() => { setPaso('codigo'); setGrupo(null); }}
              disabled={enCurso}
            >
              No, revisar el código
            </Boton>
            <Boton onClick={confirmar} disabled={enCurso}>
              {enCurso ? 'Vinculando…' : 'Confirmar vinculación'}
            </Boton>
          </>
        )}
      >
        <div className="ph-pila">
          {error && <Aviso tono="error" titulo="No se pudo vincular">{error}</Aviso>}
          <VistaPreviaGrupo grupo={grupo} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Vincularme a un grupo"
      apoyo="Pide el código a tu docente responsable."
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton type="submit" form="formulario-codigo" disabled={enCurso}>
            {enCurso ? 'Comprobando…' : 'Continuar'}
          </Boton>
        </>
      )}
    >
      <form id="formulario-codigo" className="ph-pila" onSubmit={consultar} noValidate>
        {error && <Aviso tono="error" titulo="Ese código no sirve">{error}</Aviso>}

        <Campo
          etiqueta="Código de vinculación"
          obligatorio
          ayuda="No distingue mayúsculas de minúsculas."
        >
          {(atributos) => (
            <input
              {...atributos}
              className={`ph-campo__control ph-campo-codigo${error ? ' ph-campo__control--error' : ''}`}
              placeholder="PRL-2026-A4F2"
              autoComplete="off"
              value={codigo}
              onChange={(evento) => { setCodigo(evento.target.value); setError(null); }}
              disabled={enCurso}
            />
          )}
        </Campo>

        <Aviso>
          Puedes tener varias prácticas activas a la vez. Vincularte a una nueva no afecta
          a las que ya tienes.
        </Aviso>
      </form>
    </Modal>
  );
};

export default VincularGrupo;
