import { useCallback, useEffect, useMemo, useState } from 'react';
import { GrupoContext } from './grupoContexto';
import { useAuth } from './useAuth';
import { grupoService, vinculacionService } from '../services';
import { ESTADO_GRUPO, ROLES } from '../utils/constants';

/**
 * El grupo cargado.
 *
 * RN-04 es la regla que da sentido a todo este módulo: hay que **seleccionar un grupo
 * antes de consultar o modificar nada**, y toda acción se ejecuta sobre el grupo cargado
 * y no puede afectar a otro. Antes no existía: ninguna ruta llevaba grupo (B-01).
 *
 * Qué garantiza este proveedor:
 *
 *  - **Pertenencia.** Un estudiante solo carga grupos en los que está vinculado (RN-17);
 *    un docente, solo los de su cuenta (RN-18). Un `:grupoId` ajeno o inventado no da un
 *    panel vacío: da «Grupo no encontrado». La interfaz no es la autoridad —eso lo hace
 *    el backend (RNF-03)—, pero tampoco debe enseñar lo que no toca.
 *  - **Nada cruzado.** El estado se recarga entero cuando cambia `grupoId` y no se guarda
 *    ningún dato de un grupo anterior. Volver al Dashboard y entrar en otro no puede
 *    arrastrar información del primero (§9).
 *  - **Una carrera menos.** Si se cambia de grupo mientras la petición anterior sigue en
 *    vuelo, la respuesta vieja se descarta: `vigente` evita pintar el grupo equivocado.
 */
export const GrupoProvider = ({ grupoId, children }) => {
  const { usuario, esDocente } = useAuth();
  const [estado, setEstado] = useState({
    grupo: null,
    vinculacion: null,
    cargando: true,
    error: null,
  });

  /**
   * No pone `cargando: true` al empezar: el estado inicial ya lo está, y `LayoutGrupo`
   * remonta este proveedor con `key={grupoId}` al cambiar de grupo, así que cada carga
   * arranca limpia. Llamar a `setState` de forma síncrona dentro del efecto solo
   * provocaría un render de más. Para un reintento manual sí hace falta, y de eso se
   * encarga `recargar`, que no corre dentro de un efecto.
   */
  const cargar = useCallback(async (señal) => {
    try {
      const grupo = await grupoService.obtener(grupoId);

      // RN-18: el docente solo entra a los grupos asociados a su cuenta.
      if (usuario.rol === ROLES.DOCENTE && grupo.docenteId !== usuario.id) {
        if (señal.vigente) {
          setEstado({
            grupo: null,
            vinculacion: null,
            cargando: false,
            error: 'Este grupo no está asociado a tu cuenta.',
          });
        }
        return;
      }

      // RN-17: el estudiante solo entra a sus propias vinculaciones.
      let vinculacion = null;
      if (usuario.rol === ROLES.ESTUDIANTE) {
        vinculacion = await vinculacionService.deEstudianteEnGrupo(usuario.id, grupoId);
        if (!vinculacion) {
          if (señal.vigente) {
            setEstado({
              grupo: null,
              vinculacion: null,
              cargando: false,
              error: 'No estás vinculado a esta práctica.',
            });
          }
          return;
        }
      }

      if (señal.vigente) {
        setEstado({ grupo, vinculacion, cargando: false, error: null });
      }
    } catch (fallo) {
      if (señal.vigente) {
        setEstado({
          grupo: null,
          vinculacion: null,
          cargando: false,
          error: fallo?.mensaje ?? 'No se pudo cargar la práctica.',
        });
      }
    }
  }, [grupoId, usuario]);

  useEffect(() => {
    const señal = { vigente: true };
    /*
     * `react-hooks` avisa de los `setState` síncronos dentro de un efecto porque
     * encadenan renders. Aquí no los hay: `cargar` espera a los servicios antes de
     * tocar el estado, y `señal.vigente` descarta la respuesta si el grupo cambió
     * mientras tanto. La regla no puede verlo a través de la llamada, así que se silencia
     * en esta línea y solo en esta.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar(señal);
    return () => { señal.vigente = false; };
  }, [cargar]);

  const recargar = useCallback(() => {
    setEstado((previo) => ({ ...previo, cargando: true, error: null }));
    cargar({ vigente: true });
  }, [cargar]);

  const valor = useMemo(() => ({
    ...estado,
    esDocente,
    // RN-03: grupo y código comparten estado, e INACTIVO significa solo lectura.
    soloLectura: estado.grupo ? estado.grupo.estado !== ESTADO_GRUPO.ACTIVO : true,
    recargar,
  }), [estado, esDocente, recargar]);

  return <GrupoContext.Provider value={valor}>{children}</GrupoContext.Provider>;
};
