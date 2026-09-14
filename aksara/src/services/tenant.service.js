import api from './api';

export const tenantService = {
  
  getTenants: (skip = 0, limit = 50, search = '', status = '') => 
    api.get('/tenants/', {
      params: { skip, limit, search, status_filter: status } 
    }),
  getTenant: (id) => api.get(`/tenants/${id}`),
  checkKodeUnik: (kode) => api.get(`/tenants/check-kode?kode=${encodeURIComponent(kode)}`),
  createTenant: (data) => api.post('/tenants/', data),
  updateTenant: (id, data) => api.put(`/tenants/${id}`, data),
  updateTenantStatus: (id, status) => api.patch(`/tenants/${id}/status`, { status }),
  deleteTenant: (id) => api.delete(`/tenants/${id}`),

  addWebsite: (tenantId, data) => api.post(`/tenants/${tenantId}/websites`, data),
  updateWebsite: (tenantId, websiteId, data) => api.put(`/tenants/${tenantId}/websites/${websiteId}`, data),
  deleteWebsite: (tenantId, websiteId) => api.delete(`/tenants/${tenantId}/websites/${websiteId}`),

  impersonateTenant: (id) => api.post(`/tenants/${id}/impersonate`),
};