import { useEffect, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { grupoService } from '../../services';
import { Cargando, EstadoError } from '../../components/ui';
import { Conversacion } from '../../components/mensajes';

// Página de mensajes del estudiante: su conversación con el docente de esta práctica.

const MensajesEstudiante = () => {
  const { grupo } = useGrupo();
  const { usuario } = useAuth();
  const [estado, setEstado] = useState({ vinculacionId: null, cargando: true, error: null });

  useEffect(() => {
    let vigente = true;
    grupoService.resumenEstudiante(grupo.id, usuario.id)
      .then((datos) => {
        if (vigente) setEstado({ vinculacionId: datos.vinculacionId, cargando: false, error: null });
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({ vinculacionId: null, cargando: false, error: fallo?.mensaje ?? 'No se pudo abrir la conversación.' });
        }
      });
    return () => { vigente = false; };
  }, [grupo.id, usuario.id]);

  if (estado.cargando) return <Cargando mensaje="Abriendo la conversación…" />;
  if (estado.error || !estado.vinculacionId) {
    return <EstadoError titulo="Mensajes no disponibles" mensaje={estado.error ?? ''} />;
  }

  return (
    <section className="ph-pila">
      <div>
        <h2>Mensajes con tu docente</h2>
        <p className="ph-tarjeta__apoyo">
          Usa este espacio para avisar de un atraso, pedir ayuda o acordar cómo ponerte al día.
        </p>
      </div>
      <Conversacion vinculacionId={estado.vinculacionId} />
    </section>
  );
};

export default MensajesEstudiante;
