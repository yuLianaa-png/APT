// Componente de estado vacío, con un título, un mensaje opcional y un botón opcional para realizar una acción.
const EstadoVacio = ({ titulo, children, accion = null }) => (
  <div className="ph-estado">
    <p className="ph-estado__titulo">{titulo}</p>
    {children && <p className="ph-estado__apoyo">{children}</p>}
    {accion}
  </div>
);

export default EstadoVacio;
