import { describe, expect, it } from 'vitest';
import {
  CAUSA_RECHAZO,
  esPrevisualizable,
  etiquetaFormato,
  extensionDe,
  formatearTamano,
  modoVistaPrevia,
  validarArchivo,
} from '../archivos';
import { LIMITES_ARCHIVO } from '../constants';

/** Imita lo justo de un `File` del navegador: nombre, tipo declarado y tamaño. */
const archivo = (name, type = '', size = 1024) => ({ name, type, size });

const MB = 1024 * 1024;

describe('tamaño (RNF-08)', () => {
  it('acepta un PDF de 39 MB', () => {
    expect(validarArchivo(archivo('informe.pdf', 'application/pdf', 39 * MB)).ok).toBe(true);
  });

  it('acepta exactamente 40 MB: el límite es inclusive', () => {
    const justo = archivo('informe.pdf', 'application/pdf', LIMITES_ARCHIVO.TAMANO_MAXIMO_BYTES);
    expect(validarArchivo(justo).ok).toBe(true);
  });

  it('rechaza 40 MB más un byte', () => {
    const pasado = archivo('informe.pdf', 'application/pdf', LIMITES_ARCHIVO.TAMANO_MAXIMO_BYTES + 1);
    const resultado = validarArchivo(pasado);
    expect(resultado.ok).toBe(false);
    expect(resultado.causa).toBe(CAUSA_RECHAZO.TAMANO);
  });

  it('rechaza 41 MB y dice cuánto pesa', () => {
    const resultado = validarArchivo(archivo('informe.pdf', 'application/pdf', 41 * MB));
    expect(resultado.causa).toBe(CAUSA_RECHAZO.TAMANO);
    expect(resultado.mensaje).toMatch(/41,0 MB/);
    expect(resultado.mensaje).toMatch(/40 MB/);
  });
});

describe('formatos admitidos (§7.1)', () => {
  const admitidos = [
    ['informe.pdf', 'application/pdf'],
    ['informe.doc', 'application/msword'],
    ['informe.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['datos.xls', 'application/vnd.ms-excel'],
    ['datos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['charla.ppt', 'application/vnd.ms-powerpoint'],
    ['charla.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['notas.txt', 'text/plain'],
    ['foto.jpg', 'image/jpeg'],
    ['foto.jpeg', 'image/jpeg'],
    ['captura.png', 'image/png'],
  ];

  it.each(admitidos)('acepta %s', (nombre, tipo) => {
    expect(validarArchivo(archivo(nombre, tipo)).ok).toBe(true);
  });

  it('acepta una extensión en mayúsculas', () => {
    expect(validarArchivo(archivo('INFORME.PDF', 'application/pdf')).ok).toBe(true);
  });

  it('acepta un archivo sin tipo declarado si la extensión vale', () => {
    // Algunos sistemas no informan `type`; la extensión decide.
    expect(validarArchivo(archivo('informe.docx', '')).ok).toBe(true);
  });
});

describe('formatos rechazados, con causa distinta (§5.20)', () => {
  it('rechaza un video por extensión', () => {
    const resultado = validarArchivo(archivo('practica.mp4', 'video/mp4', 5 * MB));
    expect(resultado.causa).toBe(CAUSA_RECHAZO.VIDEO);
    expect(resultado.mensaje).toMatch(/videos/i);
  });

  it('rechaza un ejecutable', () => {
    const resultado = validarArchivo(archivo('instalador.exe', 'application/x-msdownload'));
    expect(resultado.causa).toBe(CAUSA_RECHAZO.EJECUTABLE);
  });

  it('rechaza un .zip como formato no admitido, no como ejecutable', () => {
    const resultado = validarArchivo(archivo('carpeta.zip', 'application/zip'));
    expect(resultado.causa).toBe(CAUSA_RECHAZO.FORMATO);
  });

  it('rechaza un .js como script', () => {
    expect(validarArchivo(archivo('script.js', 'text/javascript')).causa)
      .toBe(CAUSA_RECHAZO.EJECUTABLE);
  });

  it('cada causa da un mensaje distinto', () => {
    const mensajes = [
      validarArchivo(archivo('a.mp4', 'video/mp4')).mensaje,
      validarArchivo(archivo('a.exe', '')).mensaje,
      validarArchivo(archivo('a.zip', '')).mensaje,
      validarArchivo(archivo('a.pdf', 'application/pdf', 50 * MB)).mensaje,
      validarArchivo(archivo('../a.pdf', 'application/pdf')).mensaje,
    ];
    expect(new Set(mensajes).size).toBe(mensajes.length);
  });
});

describe('intentos de disfrazar el archivo', () => {
  it('rechaza informe.pdf.exe: termina en ejecutable', () => {
    const resultado = validarArchivo(archivo('informe.pdf.exe', ''));
    expect(resultado.causa).toBe(CAUSA_RECHAZO.EJECUTABLE);
  });

  it('rechaza informe.exe.pdf: esconde un ejecutable en medio', () => {
    const resultado = validarArchivo(archivo('informe.exe.pdf', 'application/pdf'));
    expect(resultado.causa).toBe(CAUSA_RECHAZO.EJECUTABLE);
  });

  it('rechaza un .mp4 renombrado a .pdf por su tipo declarado', () => {
    const resultado = validarArchivo(archivo('informe.pdf', 'video/mp4'));
    expect(resultado.causa).toBe(CAUSA_RECHAZO.VIDEO);
  });

  it('rechaza un .docx cuyo tipo declarado no corresponde', () => {
    const resultado = validarArchivo(archivo('informe.docx', 'application/x-msdownload'));
    expect(resultado.causa).toBe(CAUSA_RECHAZO.FORMATO);
  });

  it('rechaza video.mp4.pdf', () => {
    expect(validarArchivo(archivo('video.mp4.pdf', 'application/pdf')).causa)
      .toBe(CAUSA_RECHAZO.VIDEO);
  });
});

describe('nombre del archivo', () => {
  it('rechaza separadores de ruta', () => {
    expect(validarArchivo(archivo('carpeta/informe.pdf', 'application/pdf')).causa)
      .toBe(CAUSA_RECHAZO.NOMBRE);
    expect(validarArchivo(archivo('carpeta\\informe.pdf', 'application/pdf')).causa)
      .toBe(CAUSA_RECHAZO.NOMBRE);
  });

  it('rechaza puntos dobles', () => {
    expect(validarArchivo(archivo('../../informe.pdf', 'application/pdf')).causa)
      .toBe(CAUSA_RECHAZO.NOMBRE);
  });

  it('rechaza un nombre vacío', () => {
    expect(validarArchivo(archivo('   ', 'application/pdf')).causa).toBe(CAUSA_RECHAZO.NOMBRE);
  });

  it('rechaza un nombre larguísimo', () => {
    expect(validarArchivo(archivo(`${'a'.repeat(200)}.pdf`, 'application/pdf')).causa)
      .toBe(CAUSA_RECHAZO.NOMBRE);
  });

  it('rechaza caracteres de control', () => {
    expect(validarArchivo(archivo('informe\u0000.pdf', 'application/pdf')).causa)
      .toBe(CAUSA_RECHAZO.NOMBRE);
  });

  it('rechaza un archivo sin extensión', () => {
    const resultado = validarArchivo(archivo('informe', ''));
    expect(resultado.causa).toBe(CAUSA_RECHAZO.FORMATO);
    expect(resultado.mensaje).toMatch(/sin extensión|no tiene extensión/i);
  });
});

describe('sin archivo', () => {
  it('pide que se seleccione uno', () => {
    expect(validarArchivo(null).causa).toBe(CAUSA_RECHAZO.VACIO);
    expect(validarArchivo(undefined).ok).toBe(false);
  });
});

describe('vista previa (decisión A-07)', () => {
  it('PDF, imágenes y texto se previsualizan', () => {
    expect(esPrevisualizable({ extension: 'pdf' })).toBe(true);
    expect(esPrevisualizable({ extension: 'png' })).toBe(true);
    expect(esPrevisualizable({ extension: 'jpeg' })).toBe(true);
    expect(esPrevisualizable({ extension: 'txt' })).toBe(true);
  });

  it('los formatos de Office no', () => {
    expect(esPrevisualizable({ extension: 'docx' })).toBe(false);
    expect(esPrevisualizable({ extension: 'xlsx' })).toBe(false);
    expect(esPrevisualizable({ extension: 'pptx' })).toBe(false);
  });

  it('cada formato elige su modo de dibujo', () => {
    expect(modoVistaPrevia({ extension: 'pdf' })).toBe('pdf');
    expect(modoVistaPrevia({ extension: 'png' })).toBe('imagen');
    expect(modoVistaPrevia({ extension: 'txt' })).toBe('texto');
    expect(modoVistaPrevia({ extension: 'docx' })).toBe('ficha');
  });

  it('deduce la extensión del nombre si no viene aparte', () => {
    expect(modoVistaPrevia({ nombre: 'informe.pdf' })).toBe('pdf');
    expect(esPrevisualizable({ nombre: 'plantilla.docx' })).toBe(false);
  });
});

describe('ayudantes de formato', () => {
  it('extrae la extensión', () => {
    expect(extensionDe('informe.PDF')).toBe('pdf');
    expect(extensionDe('sin_extension')).toBe('');
    expect(extensionDe('a.b.c')).toBe('c');
  });

  it('formatea el tamaño', () => {
    expect(formatearTamano(512)).toBe('512 B');
    expect(formatearTamano(2048)).toBe('2 KB');
    expect(formatearTamano(5 * MB)).toBe('5,0 MB');
  });

  it('nombra el formato en castellano', () => {
    expect(etiquetaFormato({ extension: 'docx' })).toBe('Documento de Word');
    expect(etiquetaFormato({ extension: 'xlsx' })).toBe('Planilla de Excel');
    expect(etiquetaFormato({ extension: 'pdf' })).toBe('Documento PDF');
  });
});
