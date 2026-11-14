import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { grupoService } from '../../services';
import { normalizar } from '../../utils/filtros';
import {
  Aviso, Cargando, EstadoError, EstadoVacio, Filtros,
} from '../../components/ui';
import TablaEstudiantes, { AccionVerJornadas } from '../../components/estudiantes/TablaEstudiantes';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de jornadas del grupo, vista por el docente. Se usa en `LayoutGrupo` y se accede desde el menú lateral del grupo.

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Estudiante' },
  { clave: 'horas', titulo: 'Horas', numerica: true },
  { clave: 'jornadas', titulo: 'Jornadas', numerica: true },
  { clave: 'solicitudes', titulo: 'Solicitudes', numerica: true },
  { clave: 'correcciones', titulo: 'Correcciones', numerica: true },
  { clave: 'accion', titulo: 'Acciones', acciones: true },
];

const JornadasDocente = () => {
  const { usuario } = useAuth();
  const { grupo } = useGrupo();
  const navegar = useNavigate();

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
    return estado.padron.filter((fila) => normalizar(fila.nombre).includes(buscado));
  }, [estado.padron, nombre]);

  if (estado.cargando) return <Cargando mensaje="Cargando los estudiantes…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} alReintentar={cargar} />;

  const base = baseDeGrupo(usuario.rol, grupo.id);
  const pendientes = estado.padron.reduce((total, f) => total + f.solicitudesPendientes, 0);

  return (
    <section className="ph-pila">
      <div>
        <h2>Jornadas por estudiante</h2>
        <p className="ph-tarjeta__apoyo">
          Elige a un estudiante para ver su historial. Las jornadas se revisan una a una:
          lo que hagas con una persona no afecta a las demás.
        </p>
      </div>

      {pendientes > 0 && (
        <Aviso tono="espera" titulo="Hay solicitudes de corrección esperando">
          {`${pendientes} ${pendientes === 1 ? 'jornada necesita' : 'jornadas necesitan'} tu respuesta. Mientras no la des, siguen bloqueadas para el estudiante.`}
        </Aviso>
      )}

      <Filtros
        resultados={visibles.length}
        total={estado.padron.length}
        campos={[
          {
            clave: 'nombre',
            etiqueta: 'Nombre del estudiante',
            valor: nombre,
            ejemplo: 'Yuliana',
            alCambiar: setNombre,
          },
        ]}
      />

      <TablaEstudiantes
        titulo="Estudiantes del grupo, con el resumen de sus jornadas"
        estudiantes={visibles}
        grupo={grupo}
        columnas={COLUMNAS}
        accion={(fila) => (
          <AccionVerJornadas
            fila={fila}
            alVer={(elegido) => navegar(`${base}/jornadas/${elegido.vinculacionId}`)}
          />
        )}
        vacio={nombre.trim() ? (
          <EstadoVacio titulo="Ningún estudiante coincide con esa búsqueda">
            Prueba con parte del nombre.
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

export default JornadasDocente;
