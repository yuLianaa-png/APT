import Boton from './Boton';

// Componente de estado de error, con un título, un mensaje, un código opcional y un botón para reintentar.

const EstadoError = ({
  titulo = 'No se pudo cargar la información',
  mensaje = 'Vuelve a intentarlo en unos segundos.',
  codigo = null,
  alReintentar = null,
}) => (
  <div className="ph-estado ph-estado--error" role="alert">
    <p className="ph-estado__titulo">{titulo}</p>
    <p className="ph-estado__apoyo">{mensaje}</p>
    {codigo && <span className="ph-solo-lectores">{`Código: ${codigo}`}</span>}
    {alReintentar && (
      <Boton variante="secundario" onClick={alReintentar}>Volver a intentar</Boton>
    )}
  </div>
);

export default EstadoError;
