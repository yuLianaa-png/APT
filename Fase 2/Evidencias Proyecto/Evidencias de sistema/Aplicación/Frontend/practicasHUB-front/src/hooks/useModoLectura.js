import { useGrupo } from '../context/useGrupo';
import { MOTIVOS_BLOQUEO } from '../utils/constants';

export const useModoLectura = () => {
  const { soloLectura } = useGrupo();

  return {
    soloLectura,
    motivo: soloLectura ? MOTIVOS_BLOQUEO.GRUPO_INACTIVO : null,
    /** Atajo para pasar las dos props de golpe a un `Boton`. */
    propsBoton: { bloqueado: soloLectura, motivoBloqueo: soloLectura ? MOTIVOS_BLOQUEO.GRUPO_INACTIVO : null },
  };
};

export default useModoLectura;
