import api from './api';

export const knowledgeService = {
  getArticles: (params) => api.get('/knowledge/', { params }),
  getArticle: (id) => api.get(`/knowledge/${id}`),
  createArticle: (data) => api.post('/knowledge', data),
  updateArticle: (id, data) => api.put(`/knowledge/${id}`, data),
  deleteArticle: (id) => api.delete(`/knowledge/${id}`),

  getInteractions: (params) => api.get('/knowledge/interactions', { params }),
  logInteraction: (data) => api.post('/knowledge/interactions', data),
};