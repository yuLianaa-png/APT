import { useState } from 'react';
import { Aviso, Boton, InsigniaEstado, Modal } from '../ui';
import { formatearHoras } from '../../utils/horas';

// Modal que muestra el código de un grupo recién creado, con su nombre, meta mínima y año.

const CodigoCreado = ({ grupo, alCerrar }) => {
  const [copia, setCopia] = useState({ estado: 'inicial', mensaje: null });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(grupo.codigo);
      setCopia({ estado: 'copiado', mensaje: 'Código copiado al portapapeles.' });
      setTimeout(() => setCopia({ estado: 'inicial', mensaje: null }), 2500);
    } catch {
      setCopia({
        estado: 'fallo',
        mensaje: 'Tu navegador no permitió copiar automáticamente. Selecciona el código y cópialo a mano.',
      });
    }
  };

  return (
    <Modal
      titulo="Grupo creado"
      apoyo="Comparte este código con tus estudiantes para que se vinculen."
      alCerrar={alCerrar}
      pie={<Boton onClick={alCerrar}>Entendido</Boton>}
    >
      <div className="ph-pila">
        <div className="ph-codigo-creado">
          <span className="ph-codigo-creado__etiqueta">Código de vinculación</span>
          <strong className="ph-codigo-creado__valor">{grupo.codigo}</strong>
          <div className="ph-fila">
            <InsigniaEstado tipo="grupo" estado={grupo.estado} prefijo="Código" />
            <Boton
              variante={copia.estado === 'copiado' ? 'secundario' : 'primario'}
              tamano="pequeno"
              onClick={copiar}
            >
              {copia.estado === 'copiado' ? '✓ Copiado' : 'Copiar código'}
            </Boton>
          </div>
        </div>

        {/* El resultado de copiar se anuncia, no solo se pinta. */}
        <p aria-live="polite" className="ph-campo__ayuda">
          {copia.mensaje ?? ''}
        </p>

        <dl className="ph-ficha">
          <div>
            <dt>Grupo</dt>
            <dd>{grupo.nombre}</dd>
          </div>
          <div>
            <dt>Meta mínima</dt>
            <dd>{`${formatearHoras(grupo.metaMinimaHoras)} h por estudiante`}</dd>
          </div>
          <div>
            <dt>Año</dt>
            <dd>{grupo.anio}</dd>
          </div>
        </dl>

        <Aviso>
          Este código no se puede regenerar. Si desactivas el grupo deja de aceptar
          vinculaciones nuevas, y al reactivarlo vuelve a ser el mismo.
        </Aviso>
      </div>
    </Modal>
  );
};

export default CodigoCreado;
