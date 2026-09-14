import api from './api';

export const widgetService = {
  getWidgetConfig: (tenantId) => api.get(`/tenants/${tenantId}/widget-config`),
  updateWidgetConfig: (tenantId, data) => api.put(`/tenants/${tenantId}/widget-config`, data),
};