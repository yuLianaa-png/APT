import { useEffect, useState } from 'react';
import { Aviso } from '../ui';
import DescargarArchivo from './DescargarArchivo';
import { etiquetaFormato, formatearTamano, modoVistaPrevia } from '../../utils/archivos';

/**
 * Vista previa de un archivo.
 *
 * **Decisión A-07.** El manual pide «previsualizar» sin decir qué ocurre con los formatos
 * de Office, y el navegador no los sabe mostrar: haría falta un conversor en el servidor
 * o un visor externo, que el MVP no tiene. Así que:
 *
 *   PDF            -> incrustado
 *   JPG, PNG       -> imagen
 *   TXT            -> texto en línea
 *   Office         -> ficha con nombre, formato, tamaño y Descargar
 *
 * La ficha no es un error ni un hueco: es la vista previa de ese formato. Por eso el
 * bloque se ve igual de acabado en los dos casos, y la acción de descargar está siempre.
 * Conviene dejarlo escrito en el manual para que no se lea como función a medias.
 */

/** Previsualización de texto plano: se lee el contenido y se muestra tal cual. */
const VistaTexto = ({ archivo }) => {
  const [estado, setEstado] = useState({ cargando: true, texto: '', error: null });

  useEffect(() => {
    let vigente = true;

    fetch(archivo.url)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(String(respuesta.status));
        return respuesta.text();
      })
      .then((texto) => {
        if (vigente) setEstado({ cargando: false, texto: texto.slice(0, 4000), error: null });
      })
      .catch(() => {
        if (vigente) {
          setEstado({ cargando: false, texto: '', error: 'No se pudo leer el archivo.' });
        }
      });

    return () => { vigente = false; };
  }, [archivo.url]);

  if (estado.cargando) return <p className="ph-campo__ayuda">Cargando el contenido…</p>;
  if (estado.error) return <Aviso tono="error">{estado.error}</Aviso>;

  return <pre className="ph-vista-previa__texto">{estado.texto}</pre>;
};

const VistaPrevia = ({ archivo, alto = 440 }) => {
  if (!archivo) return null;

  const modo = archivo.url ? modoVistaPrevia(archivo) : 'ficha';

  return (
    <div className="ph-vista-previa">
      <div className="ph-vista-previa__cabecera">
        <span className="ph-vista-previa__datos">
          <strong>{archivo.nombre}</strong>
          <span className="ph-campo__ayuda">
            {`${etiquetaFormato(archivo)} · ${formatearTamano(archivo.tamanoBytes)}`}
          </span>
        </span>
        <DescargarArchivo archivo={archivo} />
      </div>

      <div className="ph-vista-previa__lienzo">
        {modo === 'pdf' && (
          <object
            className="ph-vista-previa__marco"
            data={archivo.url}
            type="application/pdf"
            style={{ height: alto }}
            aria-label={`Vista previa de ${archivo.nombre}`}
          >
            {/* Si el navegador no incrusta PDF, queda la alternativa de siempre. */}
            <p className="ph-campo__ayuda">
              Tu navegador no puede mostrar este PDF aquí. Usa el botón Descargar.
            </p>
          </object>
        )}

        {modo === 'imagen' && (
          <img
            className="ph-vista-previa__imagen"
            src={archivo.url}
            alt={`Vista previa de ${archivo.nombre}`}
            style={{ maxHeight: alto }}
          />
        )}

        {modo === 'texto' && <VistaTexto archivo={archivo} />}

        {modo === 'ficha' && (
          <div className="ph-vista-previa__ficha">
            <p className="ph-estado__titulo">{etiquetaFormato(archivo)}</p>
            <p className="ph-estado__apoyo">
              {archivo.url
                ? 'Los documentos de Office no se pueden mostrar dentro del navegador. Descárgalo para revisarlo.'
                : 'El contenido de este archivo no está disponible tras recargar la página; es una limitación de los datos simulados.'}
            </p>
            <DescargarArchivo archivo={archivo} etiqueta="Descargar para revisar" tamano="normal" />
          </div>
        )}
      </div>
    </div>
  );
};

export default VistaPrevia;
