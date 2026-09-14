import api from './api';

export const wargaService = {
  getWargaList: (params) => api.get('/warga', { params }),
  getWargaDetail: (id) => api.get(`/warga/${id}`),
  createWarga: (data) => api.post('/warga', data),
  updateWarga: (id, data) => api.put(`/warga/${id}`, data),
  deleteWarga: (id) => api.delete(`/warga/${id}`),
};