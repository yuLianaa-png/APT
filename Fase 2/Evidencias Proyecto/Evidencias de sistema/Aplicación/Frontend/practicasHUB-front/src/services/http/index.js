/**
 * Implementación sobre la API REST.
 *
 * Mismas firmas que los servicios simulados de `services/mock/`: cuando
 * `VITE_USAR_MOCKS` pase a `false`, las pantallas no cambian.
 *
 * ADVERTENCIA: estas rutas son la **propuesta de contrato** que el frontend necesita,
 * derivada del contrato canónico de M-01. El backend de Spring Boot todavía no existe,
 * así que ninguna de ellas está verificada contra un servidor real. Al implementar la
 * API hay que confirmar rutas, verbos y forma de los errores, y actualizar este archivo
 * en el mismo cambio.
 *
 * El backend es el único que autoriza de verdad (RNF-03, §8): valida rol, pertenencia al
 * grupo y relación con el recurso. Que una pantalla oculte un botón no es autorización.
 */

import api from '../api';

const datos = (respuesta) => respuesta.data;

export const authHttp = {
  login: (correo, password) => api.post('/auth/login', { correo, password }).then(datos),
  registrar: (payload) => api.post('/auth/registro', payload).then(datos),
  perfil: () => api.get('/auth/perfil').then(datos),
  cuentasDisponibles: () => Promise.resolve([]),
};

export const grupoHttp = {
  listarDelDocente: () => api.get('/grupos').then(datos),
  obtener: (grupoId) => api.get(`/grupos/${grupoId}`).then(datos),
  obtenerPorCodigo: (codigo) => api.get(`/grupos/codigo/${codigo}`).then(datos),
  crear: (payload) => api.post('/grupos', payload).then(datos),
  desactivar: (grupoId) => api.patch(`/grupos/${grupoId}/desactivar`).then(datos),
  reactivar: (grupoId) => api.patch(`/grupos/${grupoId}/reactivar`).then(datos),
  estudiantesDelGrupo: (grupoId) => api.get(`/grupos/${grupoId}/estudiantes`).then(datos),
  resumen: (grupoId) => api.get(`/grupos/${grupoId}/resumen`).then(datos),
  resumenEstudiante: (grupoId) => api.get(`/grupos/${grupoId}/resumen/mio`).then(datos),
};

export const vinculacionHttp = {
  listarDelEstudiante: () => api.get('/vinculaciones').then(datos),
  obtener: (vinculacionId) => api.get(`/vinculaciones/${vinculacionId}`).then(datos),
  deEstudianteEnGrupo: (_estudianteId, grupoId) =>
    api.get('/vinculaciones', { params: { grupoId } }).then(datos),
  previsualizarCodigo: (codigo) =>
    api.get('/vinculaciones/previsualizar', { params: { codigo } }).then(datos),
  vincular: (codigo) => api.post('/vinculaciones', { codigo }).then(datos),
  fichaDePractica: (vinculacionId) =>
    api.get(`/vinculaciones/${vinculacionId}/ficha`).then(datos),
};

export const jornadaHttp = {
  listarPorVinculacion: (vinculacionId) =>
    api.get(`/vinculaciones/${vinculacionId}/jornadas`).then(datos),
  listarDeEstudianteEnGrupo: (estudianteId, grupoId) =>
    api.get('/jornadas', { params: { estudianteId, grupoId } }).then(datos),
  obtener: (jornadaId) => api.get(`/jornadas/${jornadaId}`).then(datos),
  registrar: (vinculacionId, jornadas) =>
    api.post(`/vinculaciones/${vinculacionId}/jornadas`, { jornadas }).then(datos),
  editarDirecto: (jornadaId, cambios) =>
    api.patch(`/jornadas/${jornadaId}`, cambios).then(datos),
  guardarCorreccion: (jornadaId, cambios) =>
    api.patch(`/jornadas/${jornadaId}/correccion`, cambios).then(datos),
  indicadores: (estudianteId, grupoId) =>
    api.get('/jornadas/indicadores', { params: { estudianteId, grupoId } }).then(datos),
};

export const solicitudHttp = {
  crear: (jornadaId, motivo) =>
    api.post(`/jornadas/${jornadaId}/solicitudes`, { motivo }).then(datos),
  habilitar: (jornadaId, observacion) =>
    api.patch(`/jornadas/${jornadaId}/solicitudes/habilitar`, { observacion }).then(datos),
  rechazar: (jornadaId, comentario) =>
    api.patch(`/jornadas/${jornadaId}/solicitudes/rechazar`, { comentario }).then(datos),
  pendientesDelGrupo: (grupoId) =>
    api.get(`/grupos/${grupoId}/solicitudes`, { params: { estado: 'PENDIENTE' } }).then(datos),
  historialDeJornada: (jornadaId) =>
    api.get(`/jornadas/${jornadaId}/solicitudes`).then(datos),
};

export const documentoHttp = {
  listarPorGrupo: (grupoId) => api.get(`/grupos/${grupoId}/documentos`).then(datos),
  listarConEntregas: (grupoId) =>
    api.get(`/grupos/${grupoId}/documentos`, { params: { conEntregas: true } }).then(datos),
  // El backend sabe quién pregunta por el token: no hace falta mandar el estudiante.
  listarParaEstudiante: (grupoId) =>
    api.get(`/grupos/${grupoId}/documentos`, { params: { miEntrega: true } }).then(datos),
  obtener: (documentoId) => api.get(`/documentos/${documentoId}`).then(datos),
  versionVigente: (documento) =>
    documento?.versiones?.find((version) => version.numero === documento.versionVigente) ?? null,
  crear: (payload) => api.post(`/grupos/${payload.grupoId}/documentos`, payload).then(datos),
  cambiarArchivo: (documentoId, archivo) =>
    api.post(`/documentos/${documentoId}/versiones`, { archivo }).then(datos),
  tarjetaDocente: (documentoId) => api.get(`/documentos/${documentoId}/tarjeta`).then(datos),
};

export const entregaHttp = {
  listarPorDocumento: (documentoId) =>
    api.get(`/documentos/${documentoId}/entregas`).then(datos),
  deEstudiante: (documentoId) =>
    api.get(`/documentos/${documentoId}/entregas/mia`).then(datos),
  obtener: (entregaId) => api.get(`/entregas/${entregaId}`).then(datos),
  enviar: (entregaId, archivo) =>
    api.post(`/entregas/${entregaId}/versiones`, { archivo }).then(datos),
  solicitarCorreccion: (entregaId, comentario) =>
    api.patch(`/entregas/${entregaId}/correccion`, { comentario }).then(datos),
  indicadores: (estudianteId, grupoId) =>
    api.get('/entregas/indicadores', { params: { estudianteId, grupoId } }).then(datos),
};

export const notificacionHttp = {
  generales: () => api.get('/notificaciones').then(datos),
  delGrupo: (_usuarioId, grupoId) =>
    api.get('/notificaciones', { params: { grupoId } }).then(datos),
  totalDelUsuario: () => api.get('/notificaciones/total').then(datos),
};

export const archivoHttp = {
  // La validación del cliente sale de `utils/archivos.js` en los dos modos: es una regla
  // del dominio, no del transporte. El backend debe validar otra vez, por su cuenta.
  subir: (archivo) => {
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo);
    return api
      .post('/archivos', cuerpo, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(datos);
  },
  // Con backend será una URL firmada que el servidor entrega tras comprobar rol,
  // pertenencia al grupo y relación con el recurso (RNF-03).
  obtenerUrlDescarga: (archivoRef) =>
    api.get(`/archivos/${archivoRef.id}/descarga`).then(datos),
};
