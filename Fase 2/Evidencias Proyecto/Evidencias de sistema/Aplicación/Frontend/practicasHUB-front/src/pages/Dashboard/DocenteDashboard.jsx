import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { grupoService } from '../../services';
import { ESTADO_GRUPO, ETIQUETAS } from '../../utils/constants';
import { formatearHoras } from '../../utils/horas';
import { TODOS, filtrarPorCriterios, opcionesDeAnio } from '../../utils/filtros';
import {
  Aviso, Boton, Cargando, EstadoError, EstadoVacio, Filtros, InsigniaEstado, Tabla,
} from '../../components/ui';
import FormularioGrupo from '../../components/grupo/FormularioGrupo';
import CodigoCreado from '../../components/grupo/CodigoCreado';
import ConfirmarEstadoGrupo from '../../components/grupo/ConfirmarEstadoGrupo';

// Columnas de la tabla de grupos del docente. Se usan en `DocenteDashboard` .

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Grupo' },
  { clave: 'codigo', titulo: 'Código' },
  { clave: 'anio', titulo: 'Año', numerica: true },
  { clave: 'meta', titulo: 'Meta mínima', numerica: true },
  { clave: 'estudiantes', titulo: 'Estudiantes', numerica: true },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'acciones', titulo: 'Acciones', acciones: true },
];

const DocenteDashboard = () => {
  const { usuario } = useAuth();

  const [estado, setEstado] = useState({ grupos: [], cargando: true, error: null });
  const [texto, setTexto] = useState('');
  const [anio, setAnio] = useState(TODOS);
  const [filtroEstado, setFiltroEstado] = useState(TODOS);

  const [creando, setCreando] = useState(false);
  const [enviandoCreacion, setEnviandoCreacion] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState(null);
  const [grupoCreado, setGrupoCreado] = useState(null);

  const [cambioEstado, setCambioEstado] = useState(null);
  const [aplicandoCambio, setAplicandoCambio] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(() => {
    let vigente = true;

    grupoService.listarDelDocente(usuario.id)
      .then((grupos) => { if (vigente) setEstado({ grupos, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            grupos: [],
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudieron cargar tus grupos.',
          });
        }
      });

    return () => { vigente = false; };
  }, [usuario.id]);

  useEffect(() => cargar(), [cargar]);

  const visibles = useMemo(
    () => filtrarPorCriterios(estado.grupos, { texto, anio, estado: filtroEstado }),
    [estado.grupos, texto, anio, filtroEstado],
  );

  const hayFiltros = texto.trim() !== '' || anio !== TODOS || filtroEstado !== TODOS;

  const crear = async (datos) => {
    setEnviandoCreacion(true);
    setErrorCreacion(null);
    try {
      const grupo = await grupoService.crear({ ...datos, docenteId: usuario.id });
      setCreando(false);
      setGrupoCreado(grupo);
      // La fila nueva tiene que aparecer en la tabla .
      setEstado((previo) => ({ ...previo, grupos: [grupo, ...previo.grupos] }));
    } catch (fallo) {
      setErrorCreacion(fallo?.mensaje ?? 'No se pudo crear el grupo.');
    } finally {
      setEnviandoCreacion(false);
    }
  };

  const aplicarCambioEstado = async () => {
    const { grupo, accion } = cambioEstado;
    setAplicandoCambio(true);
    try {
      const actualizado = accion === ESTADO_GRUPO.INACTIVO
        ? await grupoService.desactivar(grupo.id)
        : await grupoService.reactivar(grupo.id);

      setEstado((previo) => ({
        ...previo,
        grupos: previo.grupos.map((g) => (g.id === actualizado.id ? actualizado : g)),
      }));
      setAviso(accion === ESTADO_GRUPO.INACTIVO
        ? `«${grupo.nombre}» quedó inactivo. Se conservó todo su historial y el código ${grupo.codigo} dejó de aceptar vinculaciones.`
        : `«${grupo.nombre}» vuelve a estar activo, con el mismo código ${grupo.codigo}.`);
      setCambioEstado(null);
    } catch (fallo) {
      setAviso(fallo?.mensaje ?? 'No se pudo cambiar el estado del grupo.');
      setCambioEstado(null);
    } finally {
      setAplicandoCambio(false);
    }
  };

  if (estado.cargando) {
    return <div className="ph-pagina"><Cargando mensaje="Cargando tus grupos…" /></div>;
  }
  if (estado.error) {
    return (
      <div className="ph-pagina">
        <EstadoError mensaje={estado.error} alReintentar={cargar} />
      </div>
    );
  }

  return (
    <div className="ph-pagina">
      <header className="ph-fila ph-fila--entre">
        <div>
          <h1>Mis grupos</h1>
          <p className="ph-tarjeta__apoyo">
            Entra en un grupo para revisar a sus estudiantes, sus jornadas y sus entregas.
          </p>
        </div>
        <Boton onClick={() => { setErrorCreacion(null); setCreando(true); }}>
          Crear grupo
        </Boton>
      </header>

      {aviso && <Aviso tono="exito" titulo="Listo">{aviso}</Aviso>}

      <Filtros
        resultados={visibles.length}
        total={estado.grupos.length}
        campos={[
          {
            clave: 'texto',
            etiqueta: 'Nombre o código',
            valor: texto,
            ejemplo: 'Informática o PRL-2026',
            alCambiar: setTexto,
          },
          {
            clave: 'anio',
            etiqueta: 'Año',
            valor: anio,
            alCambiar: setAnio,
            opciones: opcionesDeAnio(estado.grupos),
          },
          {
            clave: 'estado',
            etiqueta: 'Estado',
            valor: filtroEstado,
            alCambiar: setFiltroEstado,
            opciones: [
              { valor: TODOS, etiqueta: 'Todos' },
              { valor: ESTADO_GRUPO.ACTIVO, etiqueta: ETIQUETAS.ESTADO_GRUPO.ACTIVO },
              { valor: ESTADO_GRUPO.INACTIVO, etiqueta: ETIQUETAS.ESTADO_GRUPO.INACTIVO },
            ],
          },
        ]}
      />

      <Tabla
        titulo="Grupos y códigos"
        ocultarTitulo
        columnas={COLUMNAS}
        filas={visibles}
        claveFila={(fila) => fila.id}
        vacio={hayFiltros ? (
          <EstadoVacio
            titulo="Ningún grupo coincide con esos filtros"
            accion={(
              <Boton
                variante="secundario"
                onClick={() => { setTexto(''); setAnio(TODOS); setFiltroEstado(TODOS); }}
              >
                Quitar los filtros
              </Boton>
            )}
          >
            Prueba con otro año o quita el filtro de estado.
          </EstadoVacio>
        ) : (
          <EstadoVacio
            titulo="Todavía no has creado ningún grupo"
            accion={<Boton onClick={() => setCreando(true)}>Crear mi primer grupo</Boton>}
          >
            Al crear un grupo, el sistema genera su código de vinculación para que lo
            compartas con tus estudiantes.
          </EstadoVacio>
        )}
        celda={(fila, columna) => {
          switch (columna.clave) {
            case 'nombre':
              return <strong>{fila.nombre}</strong>;
            case 'codigo':
              return <code>{fila.codigo}</code>;
            case 'anio':
              return fila.anio ?? '—';
            case 'meta':
              return `${formatearHoras(fila.metaMinimaHoras)} h`;
            case 'estudiantes':
              return fila.totalEstudiantes;
            case 'estado':
              return <InsigniaEstado tipo="grupo" estado={fila.estado} />;
            case 'acciones': {
              const activo = fila.estado === ESTADO_GRUPO.ACTIVO;
              return (
                <>
                  {/*  Activo presenta Ingresar; Inactivo, Ver. Abren lo mismo. */}
                  <Link
                    className={`ph-boton ph-boton--pequeno${activo ? '' : ' ph-boton--secundario'}`}
                    to={`/docente/grupos/${fila.id}/resumen`}
                  >
                    {activo ? 'Ingresar' : 'Ver'}
                  </Link>
                  <Boton
                    variante={activo ? 'peligro' : 'secundario'}
                    tamano="pequeno"
                    onClick={() => setCambioEstado({
                      grupo: fila,
                      accion: activo ? ESTADO_GRUPO.INACTIVO : ESTADO_GRUPO.ACTIVO,
                    })}
                  >
                    {activo ? 'Desactivar' : 'Reactivar'}
                  </Boton>
                </>
              );
            }
            default:
              return null;
          }
        }}
      />

      {creando && (
        <FormularioGrupo
          alCrear={crear}
          alCerrar={() => setCreando(false)}
          creando={enviandoCreacion}
          errorServicio={errorCreacion}
        />
      )}

      {grupoCreado && (
        <CodigoCreado grupo={grupoCreado} alCerrar={() => setGrupoCreado(null)} />
      )}

      {cambioEstado && (
        <ConfirmarEstadoGrupo
          grupo={cambioEstado.grupo}
          accion={cambioEstado.accion}
          enCurso={aplicandoCambio}
          alConfirmar={aplicarCambioEstado}
          alCerrar={() => setCambioEstado(null)}
        />
      )}
    </div>
  );
};

export default DocenteDashboard;
