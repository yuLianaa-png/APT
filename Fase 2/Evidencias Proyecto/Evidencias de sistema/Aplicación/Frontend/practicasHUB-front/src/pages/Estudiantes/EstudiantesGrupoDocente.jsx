import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGrupo } from '../../context/useGrupo';
import { grupoService } from '../../services';
import { normalizar } from '../../utils/filtros';
import { formatearHoras } from '../../utils/horas';
import {
  Aviso, Cargando, EstadoError, EstadoVacio, Filtros,
} from '../../components/ui';
import TablaEstudiantes from '../../components/estudiantes/TablaEstudiantes';

// Página de estudiantes del grupo, vista por el docente. Se usa en `LayoutGrupo` y se accede desde el menú lateral del grupo.

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Estudiante' },
  { clave: 'vinculadoEn', titulo: 'Vinculado el' },
  { clave: 'horas', titulo: 'Horas', numerica: true },
  { clave: 'jornadas', titulo: 'Jornadas', numerica: true },
];

const EstudiantesGrupoDocente = () => {
  const { grupo } = useGrupo();
  const [estado, setEstado] = useState({ padron: [], cargando: true, error: null });
  const [nombre, setNombre] = useState('');

  const cargar = useCallback(() => {
    let vigente = true;

    grupoService.estudiantesDelGrupo(grupo.id)
      .then((padron) => { if (vigente) setEstado({ padron, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            padron: [],
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudo cargar el listado de estudiantes.',
          });
        }
      });

    return () => { vigente = false; };
  }, [grupo.id]);

  useEffect(() => cargar(), [cargar]);

  const visibles = useMemo(() => {
    const buscado = normalizar(nombre);
    if (!buscado) return estado.padron;
    return estado.padron.filter((fila) => normalizar(fila.nombre).includes(buscado)
      || normalizar(fila.correo).includes(buscado));
  }, [estado.padron, nombre]);

  if (estado.cargando) return <Cargando mensaje="Cargando los estudiantes…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} alReintentar={cargar} />;

  const totalHoras = estado.padron.reduce((total, fila) => total + fila.registradas, 0);

  return (
    <section className="ph-pila">
      <div>
        <h2>Estudiantes del grupo</h2>
        <p className="ph-tarjeta__apoyo">
          {`${estado.padron.length} ${estado.padron.length === 1 ? 'estudiante vinculado' : 'estudiantes vinculados'} con el código ${grupo.codigo}, con ${formatearHoras(Math.round(totalHoras * 100) / 100)} h registradas entre todos.`}
        </p>
      </div>

      <Aviso>
        Las horas que ves son las de esta práctica. Un estudiante con varias prácticas
        tiene un contador independiente en cada una. Para revisar sus jornadas una a una,
        usa la sección <strong>Jornadas</strong>.
      </Aviso>

      <Filtros
        resultados={visibles.length}
        total={estado.padron.length}
        campos={[
          {
            clave: 'nombre',
            etiqueta: 'Nombre o correo',
            valor: nombre,
            ejemplo: 'Yuliana o @duocuc.cl',
            alCambiar: setNombre,
          },
        ]}
      />

      <TablaEstudiantes
        titulo="Estudiantes vinculados al grupo"
        estudiantes={visibles}
        grupo={grupo}
        columnas={COLUMNAS}
        vacio={nombre.trim() ? (
          <EstadoVacio titulo="Ningún estudiante coincide con esa búsqueda">
            Prueba con parte del nombre o del correo.
          </EstadoVacio>
        ) : (
          <EstadoVacio titulo="Todavía no hay estudiantes vinculados">
            {`Comparte el código ${grupo.codigo} para que se vinculen a esta práctica.`}
          </EstadoVacio>
        )}
      />
    </section>
  );
};

export default EstudiantesGrupoDocente;
