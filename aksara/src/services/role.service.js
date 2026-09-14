import api from './api';

export const roleService = {
  getRoles: () => api.get('/roles'),
  getRole: (id) => api.get(`/roles/${id}`),
  createRole: (data) => api.post('/roles', data),
  updateRole: (id, data) => api.put(`/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/roles/${id}`),

  assignRolesToUser: (userId, roleIds) => api.post(`/roles/users/${userId}/roles`, roleIds),
  removeRoleFromUser: (userId, roleId) => api.delete(`/roles/users/${userId}/roles/${roleId}`),
};