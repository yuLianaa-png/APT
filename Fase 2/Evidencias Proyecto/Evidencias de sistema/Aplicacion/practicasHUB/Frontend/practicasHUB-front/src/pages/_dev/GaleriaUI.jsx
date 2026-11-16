import { useState } from 'react';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  EsqueletoFilas,
  EstadoError,
  EstadoVacio,
  Filtros,
  Indicador,
  Indicadores,
  InsigniaEstado,
  Modal,
  Tabla,
} from '../../components/ui';
import { CampoArchivo, DescargarArchivo, VistaPrevia } from '../../components/archivos';
import {
  ESTADO_ENTREGA,
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  MOTIVOS_BLOQUEO,
  TIPO_DOCUMENTO,
} from '../../utils/constants';
import { USAR_MOCKS } from '../../services';

/** Muestras servidas desde `public/muestras/`, para la vista previa. */
const MUESTRA = {
  pdf: { id: 'm1', nombre: 'documento-ejemplo.pdf', extension: 'pdf', tipoMime: 'application/pdf', tamanoBytes: 643, url: '/muestras/documento-ejemplo.pdf' },
  png: { id: 'm2', nombre: 'imagen-ejemplo.png', extension: 'png', tipoMime: 'image/png', tamanoBytes: 235, url: '/muestras/imagen-ejemplo.png' },
  txt: { id: 'm3', nombre: 'texto-ejemplo.txt', extension: 'txt', tipoMime: 'text/plain', tamanoBytes: 268, url: '/muestras/texto-ejemplo.txt' },
  docx: { id: 'm4', nombre: 'informe-avance.docx', extension: 'docx', tipoMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', tamanoBytes: 96500, url: '/muestras/documento-ejemplo.pdf' },
};

/**
 * Galería del sistema de diseño. Solo existe en desarrollo (`/_ui`).
 *
 * Sirve para dos cosas: ver cada componente en todos sus estados sin tener que
 * reproducir el flujo que los provoca, y comprobar con el teclado que un botón
 * bloqueado recibe foco y anuncia su motivo, que es el requisito más fácil de romper
 * sin darse cuenta (§1 y §9 del manual).
 */

const SECCIONES = [
  'Botones', 'Insignias', 'Indicadores', 'Tabla', 'Filtros',
  'Campos', 'Archivos', 'Vista previa', 'Avisos', 'Vacío, error y carga', 'Modal',
];

const FILAS_DEMO = [
  { id: 1, fecha: '18/09/2026', actividad: 'Pruebas funcionales', horas: '8,25', estado: ESTADO_JORNADA.REGISTRADA },
  { id: 2, fecha: '19/09/2026', actividad: 'Registro de incidencias', horas: '7,5', estado: ESTADO_JORNADA.OBSERVADA },
];

const COLUMNAS_DEMO = [
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'actividad', titulo: 'Actividad principal' },
  { clave: 'horas', titulo: 'Horas', numerica: true },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'acciones', titulo: 'Acciones', acciones: true },
];

/** Ancla legible: «Vacío, error y carga» → «vacio-error-y-carga». */
const slug = (texto) => texto
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const Bloque = ({ titulo, nota = null, children }) => (
  <section className="ph-pila" aria-labelledby={`bloque-${slug(titulo)}`}>
    <div>
      <h2 id={`bloque-${slug(titulo)}`}>{titulo}</h2>
      {nota && <p className="ph-tarjeta__apoyo">{nota}</p>}
    </div>
    <div className="ph-tarjeta ph-pila">{children}</div>
  </section>
);

const GaleriaUI = () => {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  // Prueba viva de la garantía del botón bloqueado: su onClick no debe correr nunca.
  const [pulsaciones, setPulsaciones] = useState({ normal: 0, bloqueado: 0 });
  const [archivoElegido, setArchivoElegido] = useState(null);

  return (
    <div className="ph-pagina">
      <header className="ph-pila">
        <h1>Sistema de diseño</h1>
        <p className="ph-tarjeta__apoyo">
          Componentes de <code>components/ui</code> en todos sus estados. Esta página solo
          existe en desarrollo. Datos simulados: {USAR_MOCKS ? 'activos' : 'desactivados'}.
        </p>
        <nav aria-label="Secciones de la galería" className="ph-fila">
          {SECCIONES.map((seccion) => (
            <a key={seccion} href={`#bloque-${slug(seccion)}`}>{seccion}</a>
          ))}
        </nav>
      </header>

      <Bloque
        titulo="Botones"
        nota="Prueba con el teclado: los bloqueados reciben foco y anuncian su motivo. No usan el atributo disabled a propósito."
      >
        <div className="ph-fila">
          <Boton>Registrar jornada</Boton>
          <Boton variante="secundario">Ver detalle</Boton>
          <Boton variante="tenue">Volver a mis prácticas</Boton>
          <Boton variante="peligro">Desactivar grupo</Boton>
          <Boton tamano="pequeno">Acción en tabla</Boton>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--ph-borde)' }} />

        <div className="ph-fila" style={{ alignItems: 'flex-start' }}>
          <Boton bloqueado motivoBloqueo={MOTIVOS_BLOQUEO.GRUPO_INACTIVO}>
            Registrar jornada
          </Boton>
          <Boton bloqueado motivoBloqueo={MOTIVOS_BLOQUEO.PLAZO_VENCIDO}>
            Editar jornada
          </Boton>
          <Boton
            variante="secundario"
            bloqueado
            motivoBloqueo={MOTIVOS_BLOQUEO.SOLICITUD_PENDIENTE}
          >
            Solicitar corrección
          </Boton>
          <Boton
            tamano="pequeno"
            bloqueado
            mostrarMotivo={false}
            motivoBloqueo={MOTIVOS_BLOQUEO.SIN_CORRECCION_HABILITADA}
          >
            Modificar
          </Boton>
        </div>
        <p className="ph-campo__ayuda">
          El último tiene el motivo solo para lectores de pantalla, para las tablas donde
          no cabe una línea más.
        </p>

        <hr style={{ border: 0, borderTop: '1px solid var(--ph-borde)' }} />

        <div className="ph-pila">
          <p className="ph-tarjeta__apoyo">
            Comprobación: los dos botones tienen el mismo <code>onClick</code>. Pulsa
            ambos — con el ratón y con Enter y Espacio desde el teclado.
          </p>
          <div className="ph-fila" style={{ alignItems: 'flex-start' }}>
            <Boton onClick={() => setPulsaciones((p) => ({ ...p, normal: p.normal + 1 }))}>
              Botón normal
            </Boton>
            <Boton
              bloqueado
              motivoBloqueo={MOTIVOS_BLOQUEO.GRUPO_INACTIVO}
              onClick={() => setPulsaciones((p) => ({ ...p, bloqueado: p.bloqueado + 1 }))}
            >
              Botón bloqueado
            </Boton>
          </div>
          <p aria-live="polite" data-prueba="contador-pulsaciones">
            Normal: <strong>{pulsaciones.normal}</strong>
            {' · '}
            Bloqueado: <strong>{pulsaciones.bloqueado}</strong>
            {pulsaciones.bloqueado > 0 && ' ← esto no debería pasar nunca'}
          </p>
        </div>
      </Bloque>

      <Bloque
        titulo="Insignias"
        nota="El color no es el único indicio: cada tono lleva su propia forma de punto."
      >
        <div className="ph-fila">
          <InsigniaEstado tipo="grupo" estado={ESTADO_GRUPO.ACTIVO} />
          <InsigniaEstado tipo="grupo" estado={ESTADO_GRUPO.INACTIVO} />
        </div>
        <div className="ph-fila">
          <InsigniaEstado tipo="jornada" estado={ESTADO_JORNADA.REGISTRADA} />
          <InsigniaEstado tipo="jornada" estado={ESTADO_JORNADA.OBSERVADA} />
        </div>
        <div className="ph-fila">
          {Object.values(ESTADO_SOLICITUD).map((estado) => (
            <InsigniaEstado key={estado} tipo="solicitud" estado={estado} prefijo="Solicitud" />
          ))}
        </div>
        <div className="ph-fila">
          {Object.values(ESTADO_ENTREGA).map((estado) => (
            <InsigniaEstado key={estado} tipo="entrega" estado={estado} />
          ))}
        </div>
        <div className="ph-fila">
          {Object.values(TIPO_DOCUMENTO).map((tipo) => (
            <InsigniaEstado key={tipo} tipo="documento" estado={tipo} />
          ))}
        </div>
      </Bloque>

      <Bloque
        titulo="Indicadores"
        nota="Los «cuatro indicadores superiores» de §4.7, §4.11 y §5.4. La barra se tope en 100 %, pero la meta no es un máximo (RN-06)."
      >
        <Indicadores>
          <Indicador etiqueta="Horas registradas" valor="182,5" detalle="de 360 h de meta mínima" avance={50.7} />
          <Indicador etiqueta="Horas restantes" valor="177,5" detalle="para alcanzar la meta" />
          <Indicador etiqueta="Jornadas registradas" valor="23" />
          <Indicador etiqueta="Solicitudes pendientes" valor="1" detalle="esperando al docente" />
        </Indicadores>
        <Indicadores>
          <Indicador etiqueta="Horas registradas" valor="412" detalle="meta mínima alcanzada" avance={100} />
          <Indicador etiqueta="Horas restantes" valor="0" detalle="las horas siguen acumulando" />
        </Indicadores>
      </Bloque>

      <Bloque titulo="Tabla" nota="Tabla real, con cabecera de fila: se puede recorrer con lector de pantalla.">
        <Tabla
          titulo="Historial de jornadas de ejemplo"
          columnas={COLUMNAS_DEMO}
          filas={FILAS_DEMO}
          claveFila={(fila) => fila.id}
          celda={(fila, columna) => {
            if (columna.clave === 'estado') {
              return <InsigniaEstado tipo="jornada" estado={fila.estado} />;
            }
            if (columna.clave === 'acciones') {
              return fila.estado === ESTADO_JORNADA.OBSERVADA
                ? <Boton tamano="pequeno">Modificar</Boton>
                : (
                  <Boton
                    tamano="pequeno"
                    variante="secundario"
                    bloqueado
                    mostrarMotivo={false}
                    motivoBloqueo={MOTIVOS_BLOQUEO.PLAZO_VENCIDO}
                  >
                    Editar
                  </Boton>
                );
            }
            return fila[columna.clave];
          }}
        />
        <Tabla
          titulo="Tabla sin resultados"
          columnas={COLUMNAS_DEMO}
          filas={[]}
          claveFila={(fila) => fila.id}
          celda={() => null}
          vacio={(
            <EstadoVacio titulo="Sin jornadas con esos filtros">
              Prueba a quitar el filtro de estado o a ampliar el rango de fechas.
            </EstadoVacio>
          )}
        />
      </Bloque>

      <Bloque titulo="Filtros">
        <Filtros
          resultados={2}
          total={14}
          campos={[
            {
              clave: 'nombre',
              etiqueta: 'Nombre o código',
              valor: filtroNombre,
              ejemplo: 'PRL-2026-A4F2',
              alCambiar: setFiltroNombre,
            },
            {
              clave: 'estado',
              etiqueta: 'Estado',
              valor: filtroEstado,
              alCambiar: setFiltroEstado,
              opciones: [
                { valor: 'TODOS', etiqueta: 'Todos' },
                { valor: ESTADO_GRUPO.ACTIVO, etiqueta: 'Activas' },
                { valor: ESTADO_GRUPO.INACTIVO, etiqueta: 'Inactivas' },
              ],
            },
          ]}
        />
      </Bloque>

      <Bloque titulo="Campos" nota="Etiqueta, ayuda y error enlazados con el control.">
        <Campo etiqueta="Actividad principal" obligatorio ayuda="Qué hiciste en la jornada.">
          {(atributos) => (
            <input
              {...atributos}
              className="ph-campo__control"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
            />
          )}
        </Campo>

        <Campo
          etiqueta="Motivo de la solicitud"
          obligatorio
          error="Explica qué necesitas corregir, con al menos 10 caracteres."
        >
          {(atributos) => (
            <textarea {...atributos} className="ph-campo__control ph-campo__control--error" />
          )}
        </Campo>

        <Campo etiqueta="Fecha de la jornada" ayuda="La fecha no se puede modificar después de registrarla.">
          {(atributos) => (
            <input {...atributos} className="ph-campo__control" type="date" value="2026-09-18" readOnly />
          )}
        </Campo>
      </Bloque>

      <Bloque
        titulo="Archivos"
        nota="Máximo 40 MB. Prueba a elegir un .exe, un .mp4, un .zip o un «informe.pdf.exe»: cada causa da un mensaje distinto y el resto del formulario no se pierde."
      >
        <CampoArchivo
          etiqueta="Evidencia de la jornada"
          ayuda="Opcional. Hasta 40 MB."
          valor={archivoElegido}
          alCambiar={setArchivoElegido}
        />

        <Campo etiqueta="Campo vecino, para comprobar que no se borra con un rechazo">
          {(atributos) => (
            <input
              {...atributos}
              className="ph-campo__control"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
            />
          )}
        </Campo>

        <CampoArchivo
          etiqueta="Archivo en una práctica inactiva"
          bloqueado
          motivoBloqueo={MOTIVOS_BLOQUEO.GRUPO_INACTIVO}
        />

        <div className="ph-fila">
          <DescargarArchivo archivo={MUESTRA.pdf} />
          <DescargarArchivo archivo={MUESTRA.docx} etiqueta="Descargar informe" />
          <DescargarArchivo
            archivo={{ nombre: 'subido-en-otra-sesion.pdf', extension: 'pdf', url: '' }}
            etiqueta="Archivo sin contenido"
          />
        </div>
      </Bloque>

      <Bloque
        titulo="Vista previa"
        nota="Decisión A-07: PDF, imágenes y texto se muestran en línea; los formatos de Office no tienen vista previa nativa en el navegador y se entregan como ficha con descarga."
      >
        <VistaPrevia archivo={MUESTRA.pdf} alto={320} />
        <VistaPrevia archivo={MUESTRA.png} alto={240} />
        <VistaPrevia archivo={MUESTRA.txt} />
        <VistaPrevia archivo={MUESTRA.docx} />
      </Bloque>

      <Bloque titulo="Avisos">
        <Aviso titulo="Podrás editar esta jornada durante 24 horas">
          Pasado ese plazo tendrás que solicitar una corrección al docente.
        </Aviso>
        <Aviso tono="exito" titulo="Corrección guardada">
          La jornada volvió a estado Registrada.
        </Aviso>
        <Aviso tono="espera" titulo="Solicitud pendiente">
          El docente aún no ha respondido.
        </Aviso>
        <Aviso tono="error" titulo="No se pudo guardar">
          Ya existe una jornada del 18/09/2026 en esta práctica.
        </Aviso>
      </Bloque>

      <Bloque titulo="Vacío, error y carga">
        <EstadoVacio
          titulo="Todavía no tienes prácticas"
          accion={<Boton>Vincularme a un grupo</Boton>}
        >
          Pide el código de vinculación a tu docente responsable e ingrésalo para empezar.
        </EstadoVacio>

        <EstadoVacio
          titulo="Sin documentos publicados"
          accion={(
            <Boton bloqueado motivoBloqueo={MOTIVOS_BLOQUEO.GRUPO_INACTIVO}>
              Crear documento
            </Boton>
          )}
        >
          Esta práctica está inactiva, así que no se pueden publicar documentos nuevos.
        </EstadoVacio>

        <EstadoError
          mensaje="No se pudo contactar con el servidor."
          codigo="NO_ENCONTRADO"
          alReintentar={() => {}}
        />

        <Cargando mensaje="Cargando tus jornadas…" />
        <EsqueletoFilas />
      </Bloque>

      <Bloque titulo="Modal" nota="Foco atrapado, Escape cierra y el foco vuelve al botón que lo abrió.">
        <Boton onClick={() => setModalAbierto(true)}>Abrir confirmación</Boton>

        {modalAbierto && (
          <Modal
            titulo="Confirmar el registro de la jornada"
            apoyo="Revisa las horas calculadas antes de guardar."
            alCerrar={() => setModalAbierto(false)}
            pie={(
              <>
                <Boton variante="secundario" onClick={() => setModalAbierto(false)}>
                  Volver a editar
                </Boton>
                <Boton onClick={() => setModalAbierto(false)}>Confirmar registro</Boton>
              </>
            )}
          >
            <div className="ph-pila">
              <p>
                18/09/2026, de 08:30 a 17:30 con 45 minutos de descanso.
                Total: <strong>8,25 horas</strong>.
              </p>
              <Aviso>
                Podrás modificar esta jornada directamente durante 24 horas. La fecha no se
                puede cambiar.
              </Aviso>
              <Campo etiqueta="Comentario opcional">
                {(atributos) => <textarea {...atributos} className="ph-campo__control" />}
              </Campo>
            </div>
          </Modal>
        )}
      </Bloque>
    </div>
  );
};

export default GaleriaUI;
