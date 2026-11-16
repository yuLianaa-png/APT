import { Aviso, Boton, Modal } from '../ui';
import { ESTADO_GRUPO } from '../../utils/constants';


// Modal de confirmación para desactivar o reactivar un grupo.

const ConfirmarEstadoGrupo = ({ grupo, accion, alConfirmar, alCerrar, enCurso = false }) => {
  const desactivando = accion === ESTADO_GRUPO.INACTIVO;

  return (
    <Modal
      titulo={desactivando ? 'Desactivar el grupo' : 'Reactivar el grupo'}
      apoyo={`${grupo.nombre} · ${grupo.codigo}`}
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton
            variante={desactivando ? 'peligro' : 'primario'}
            onClick={alConfirmar}
            disabled={enCurso}
          >
            {enCurso
              ? 'Aplicando…'
              : (desactivando ? 'Sí, desactivar' : 'Sí, reactivar')}
          </Boton>
        </>
      )}
    >
      {desactivando ? (
        <div className="ph-pila">
          <p>Al desactivar este grupo:</p>
          <ul className="ph-lista">
            <li>El código <strong>deja de aceptar vinculaciones nuevas</strong>.</li>
            <li>
              Sus {grupo.totalEstudiantes} estudiantes siguen vinculados y pasan a
              <strong> solo lectura</strong>: consultan todo, pero no registran ni entregan.
            </li>
            <li>Tú también pasas a solo lectura dentro del grupo.</li>
          </ul>

          <Aviso tono="exito" titulo="No se pierde nada">
            Jornadas, horas, evidencias, documentos, entregas, versiones y notificaciones
            se conservan íntegras. El grupo no se elimina y puedes reactivarlo cuando
            quieras desde este mismo panel.
          </Aviso>
        </div>
      ) : (
        <div className="ph-pila">
          <p>
            El grupo recupera su funcionamiento normal: vuelve a aceptar vinculaciones y
            sus estudiantes pueden registrar jornadas y gestionar entregas otra vez.
          </p>
          <Aviso>
            Mantiene <strong>el mismo código</strong>, {grupo.codigo}. Los códigos no se
            regeneran, así que el que ya repartiste sigue sirviendo.
          </Aviso>
        </div>
      )}
    </Modal>
  );
};

export default ConfirmarEstadoGrupo;
