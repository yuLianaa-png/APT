import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { vinculacionService } from '../../services';
import { ESTADO_GRUPO } from '../../utils/constants';
import { formatearHoras } from '../../utils/horas';
import { TODOS, filtrarPorCriterios, opcionesDeAnio } from '../../utils/filtros';
import {
  Aviso, Boton, Cargando, EstadoError, EstadoVacio, Filtros, InsigniaEstado, Tabla,
} from '../../components/ui';
import VincularGrupo from '../Vinculacion/VincularGrupo';

// Columnas de la tabla de prácticas del estudiante. Se usan en `EstudianteDashboard` .

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Práctica' },
  { clave: 'codigo', titulo: 'Código' },
  { clave: 'anio', titulo: 'Año', numerica: true },
  { clave: 'horas', titulo: 'Horas', numerica: true },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'acciones', titulo: 'Acciones', acciones: true },
];

const EstudianteDashboard = () => {
  const { usuario } = useAuth();

  const [estado, setEstado] = useState({ practicas: [], cargando: true, error: null });
  const [texto, setTexto] = useState('');
  const [anio, setAnio] = useState(TODOS);
  const [vinculando, setVinculando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(() => {
    let vigente = true;

    vinculacionService.listarDelEstudiante(usuario.id)
      .then((practicas) => {
        if (vigente) setEstado({ practicas, cargando: false, error: null });
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            practicas: [],
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudieron cargar tus prácticas.',
          });
        }
      });

    return () => { vigente = false; };
  }, [usuario.id]);

  useEffect(() => cargar(), [cargar]);

  const visibles = useMemo(
    () => filtrarPorCriterios(estado.practicas, { texto, anio }),
    [estado.practicas, texto, anio],
  );

  const hayFiltros = texto.trim() !== '' || anio !== TODOS;
  const activas = estado.practicas.filter((p) => p.estado === ESTADO_GRUPO.ACTIVO).length;

  /** §4.4: tras confirmar, la práctica nueva aparece en el Dashboard. */
  const vinculada = (grupo) => {
    setVinculando(false);
    setAviso(`Te vinculaste a «${grupo.nombre}». Ya puedes ingresar y registrar jornadas.`);
    cargar();
  };

  if (estado.cargando) {
    return <div className="ph-pagina"><Cargando mensaje="Cargando tus prácticas…" /></div>;
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
          <h1>Mis prácticas</h1>
          <p className="ph-tarjeta__apoyo">
            {activas > 1
              ? `Tienes ${activas} prácticas activas. Lo que hagas en una no afecta a las demás.`
              : 'Entra en una práctica para registrar jornadas y gestionar tus entregas.'}
          </p>
        </div>
        <Boton onClick={() => setVinculando(true)}>Vincularme a un grupo</Boton>
      </header>

      {aviso && <Aviso tono="exito" titulo="Vinculación creada">{aviso}</Aviso>}

      <Filtros
        resultados={visibles.length}
        total={estado.practicas.length}
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
            opciones: opcionesDeAnio(estado.practicas),
          },
        ]}
      />

      <Tabla
        titulo="Prácticas activas e inactivas"
        ocultarTitulo
        columnas={COLUMNAS}
        filas={visibles}
        claveFila={(fila) => fila.vinculacionId}
        vacio={hayFiltros ? (
          <EstadoVacio
            titulo="Ninguna práctica coincide con esos filtros"
            accion={(
              <Boton variante="secundario" onClick={() => { setTexto(''); setAnio(TODOS); }}>
                Quitar los filtros
              </Boton>
            )}
          >
            Prueba con otro año o borra la búsqueda.
          </EstadoVacio>
        ) : (
          <EstadoVacio
            titulo="Todavía no tienes prácticas"
            accion={<Boton onClick={() => setVinculando(true)}>Vincularme a un grupo</Boton>}
          >
            Pide el código de vinculación a tu docente responsable e ingrésalo aquí.
          </EstadoVacio>
        )}
        celda={(fila, columna) => {
          switch (columna.clave) {
            case 'nombre':
              return (
                <span className="ph-celda-principal">
                  <strong>{fila.nombre}</strong>
                  <span className="ph-campo__ayuda">{fila.docenteNombre}</span>
                </span>
              );
            case 'codigo':
              return <code>{fila.codigo}</code>;
            case 'anio':
              return fila.anio ?? '—';
            case 'horas':
              return (
                <span className="ph-celda-principal">
                  <span>{`${formatearHoras(fila.registradas)} / ${formatearHoras(fila.meta)} h`}</span>
                  {fila.metaAlcanzada && (
                    <span className="ph-campo__ayuda">meta alcanzada</span>
                  )}
                </span>
              );
            case 'estado':
              return <InsigniaEstado tipo="grupo" estado={fila.estado} />;
            case 'acciones':
              return (
                <Link
                  className={`ph-boton ph-boton--pequeno${fila.estado === ESTADO_GRUPO.ACTIVO ? '' : ' ph-boton--secundario'}`}
                  to={`/estudiante/grupos/${fila.grupoId}/resumen`}
                >
                  {fila.estado === ESTADO_GRUPO.ACTIVO ? 'Ingresar' : 'Ver'}
                </Link>
              );
            default:
              return null;
          }
        }}
      />

      {vinculando && (
        <VincularGrupo alVincular={vinculada} alCerrar={() => setVinculando(false)} />
      )}
    </div>
  );
};

export default EstudianteDashboard;
