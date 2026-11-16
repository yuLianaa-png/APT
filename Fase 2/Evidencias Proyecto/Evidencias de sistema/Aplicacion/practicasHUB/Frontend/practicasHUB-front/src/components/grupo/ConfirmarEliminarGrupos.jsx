import { Aviso, Boton, Modal } from '../ui';


// Modal de confirmación para eliminar uno o varios grupos seleccionados.

const ConfirmarEliminarGrupos = ({ grupos, alConfirmar, alCerrar, enCurso = false }) => {
  const varios = grupos.length > 1;
  const totalEstudiantes = grupos.reduce((total, grupo) => total + (grupo.totalEstudiantes ?? 0), 0);

  return (
    <Modal
      titulo={varios ? `¿Seguro que quieres eliminar estos ${grupos.length} grupos?` : '¿Seguro que quieres eliminar este grupo?'}
      apoyo="Esta acción no se puede deshacer."
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton variante="peligro" onClick={alConfirmar} disabled={enCurso}>
            {enCurso ? 'Eliminando…' : (varios ? 'Sí, eliminar grupos' : 'Sí, eliminar grupo')}
          </Boton>
        </>
      )}
    >
      <div className="ph-pila">
        <ul className="ph-lista">
          {grupos.map((grupo) => (
            <li key={grupo.id}>
              <strong>{grupo.nombre}</strong> · <code>{grupo.codigo}</code>
              {` · ${grupo.totalEstudiantes ?? 0} estudiantes`}
            </li>
          ))}
        </ul>

        <Aviso tono="error" titulo="Se borra todo su historial">
          {totalEstudiantes > 0
            ? `Sus ${totalEstudiantes} estudiantes quedan desvinculados y se eliminan sus jornadas y horas registradas. `
            : 'Se eliminan sus jornadas y horas registradas. '}
          El código deja de existir. Si solo quieres cerrar el grupo y conservar todo,
          usa <strong>Desactivar</strong>.
        </Aviso>
      </div>
    </Modal>
  );
};

export default ConfirmarEliminarGrupos;
