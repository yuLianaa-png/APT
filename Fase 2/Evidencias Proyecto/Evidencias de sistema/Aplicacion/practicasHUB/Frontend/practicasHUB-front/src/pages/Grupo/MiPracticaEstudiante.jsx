import { useEffect, useState } from 'react';
import { useGrupo } from '../../context/useGrupo';
import { vinculacionService } from '../../services';
import { formatearFecha, formatearInstante } from '../../utils/fechas';
import { formatearHoras } from '../../utils/horas';
import VistaPreviaGrupo from '../../components/grupo/VistaPreviaGrupo';
import { Aviso, Cargando, EstadoError } from '../../components/ui';

// Página de práctica del estudiante. Se usa en `LayoutGrupo` y se accede desde el menú lateral del grupo.

const MiPracticaEstudiante = () => {
  const { grupo, vinculacion } = useGrupo();
  const [estado, setEstado] = useState({ ficha: null, cargando: true, error: null });

  useEffect(() => {
    let vigente = true;

    vinculacionService.fichaDePractica(vinculacion.id)
      .then((ficha) => { if (vigente) setEstado({ ficha, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            ficha: null,
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudo cargar la ficha de la práctica.',
          });
        }
      });

    return () => { vigente = false; };
  }, [vinculacion.id]);

  if (estado.cargando) return <Cargando mensaje="Cargando los datos de la práctica…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} />;

  const { ficha } = estado;

  return (
    <section className="ph-pila">
      <div className="ph-tarjeta ph-pila">
        <div>
          <h2 className="ph-tarjeta__titulo">Datos de la práctica</h2>
          <p className="ph-tarjeta__apoyo">
            Los define tu docente y son comunes a todos los estudiantes de este código.
          </p>
        </div>

        <VistaPreviaGrupo grupo={grupo}>
          <div>
            <dt>Te vinculaste el</dt>
            <dd>{formatearFecha(ficha.vinculadoEn?.slice(0, 10))}</dd>
          </div>
        </VistaPreviaGrupo>
      </div>

      <div className="ph-tarjeta ph-pila">
        <div>
          <h2 className="ph-tarjeta__titulo">Tu avance</h2>
          <p className="ph-tarjeta__apoyo">
            Esto sí es solo tuyo: tus jornadas y tus horas en esta práctica.
          </p>
        </div>

        <dl className="ph-ficha">
          <div>
            <dt>Horas registradas</dt>
            <dd><strong>{`${formatearHoras(ficha.registradas)} h`}</strong></dd>
          </div>
          <div>
            <dt>Horas restantes</dt>
            <dd>{`${formatearHoras(ficha.restantes)} h`}</dd>
          </div>
          <div>
            <dt>Jornadas registradas</dt>
            <dd>{ficha.totalJornadas}</dd>
          </div>
          <div>
            <dt>Avance sobre la meta</dt>
            <dd>{`${String(ficha.porcentaje).replace('.', ',')} %`}</dd>
          </div>
        </dl>

        {ficha.metaAlcanzada && (
          <Aviso tono="exito" titulo="Alcanzaste la meta mínima">
            La meta no es un máximo: puedes seguir registrando jornadas.
          </Aviso>
        )}
      </div>

      <p className="ph-campo__ayuda">
        {`Vinculación creada el ${formatearInstante(ficha.vinculadoEn)}.`}
      </p>
    </section>
  );
};

export default MiPracticaEstudiante;
