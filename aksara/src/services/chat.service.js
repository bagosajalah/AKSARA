import api from './api';

export const chatService = {
  getSessions: (params = {}) => {
    const filteredParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        filteredParams[key] = params[key];
      }
    });
    return api.get('/chat/sessions', { params: filteredParams });
  },
  
  getSession: (id) => api.get(`/chat/sessions/${id}`),
  createSession: (data) => api.post('/chat/sessions', data),
  
  getMessages: (sessionId) => api.get(`/chat/sessions/${sessionId}/messages`),
  addMessage: (sessionId, data) => api.post(`/chat/sessions/${sessionId}/messages`, data),
  
  getReviews: (params) => api.get('/chat/reviews', { params }),
  createReview: (data) => api.post('/chat/reviews', data),
  
  getTrendingTopics: (params) => api.get('/chat/trending', { params }),
  
  publicQuery: (data) => api.post('/chat/query', data),
  
  publicQueryStream: async (data, onChunk, onDone, onError) => {
    const baseURL = api.defaults.baseURL;
    const url = `${baseURL}/chat/query/stream`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.type === 'content') {
                onChunk(json.content);
              } else if (json.type === 'done') {
                onDone(json);
              } else if (json.type === 'error') {
                onError(json.error);
              }
            } catch (e) {
              console.warn('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      onError(error.message);
    }
  }
};