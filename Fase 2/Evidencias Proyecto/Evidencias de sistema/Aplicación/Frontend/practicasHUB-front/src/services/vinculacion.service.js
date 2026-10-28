import api from './api';

export const vinculacionService = {

  getVinculacionActual: async () => {
    const response = await api.get('/vinculacion/estudiante/actual');
    return response.data;
  },


  vincularConCodigo: async (codigo) => {
    const response = await api.post('/vinculacion/vincular', { codigo });
    return response.data;
  },


  generarCodigo: async () => {
    const response = await api.post('/vinculacion/docente/generar');
    return response.data;
  },

  getCodigosDocente: async () => {
    const response = await api.get('/vinculacion/docente/codigos');
    return response.data;
  },


  anularCodigo: async (codigoId) => {
    const response = await api.patch(`/vinculacion/docente/codigos/${codigoId}/anular`);
    return response.data;
  },
};