import api from './api';

export const knowledgeService = {
  getArticles: async (params) => {
    const response = await api.get('/knowledge', { params });
    return response.data;
  },

  createArticle: async (data) => {
    const payload = {
      tenant_id: data.tenant_id,
      judul: data.judul,
      kategori: data.kategori || 'Umum',
      konten: data.konten,
      status: data.status || 'published',
      file_size: data.file_size || 0,
      file_type: data.file_type || 'TXT'
    };
    
    const response = await api.post('/knowledge', payload);
    return response.data;
  },

  updateArticle: async (id, data) => {
    const response = await api.put(`/knowledge/${id}`, data);
    return response.data;
  },

  deleteArticle: async (id) => {
    const response = await api.delete(`/knowledge/${id}`);
    return response.data;
  }
};