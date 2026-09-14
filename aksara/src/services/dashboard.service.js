import api from './api';

export const dashboardService = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
};