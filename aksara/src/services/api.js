import axios from "axios";

const getBaseUrl = () => {
    const isDocker = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
    let url = import.meta.env.VITE_API_URL;
    
    if (!url) {
        if (isDocker) {
            url = "http://backend:8000/api/v1";
        } else {
            url = "http://localhost:8000/api/v1";
        }
    }
    
    url = url.trim().replace(/\/+$/, "");
    if (!url.endsWith("/api/v1")) {
        url = `${url}/api/v1`;
    }
    return url;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        const isLoggedIn = localStorage.getItem('isAuthenticated') === 'true';
        
        console.log(`📤 [API] Request to: ${config.url}`);

        const isPublicEndpoint = config.url.includes('/auth/login') || 
                                  config.url.includes('/auth/refresh') || 
                                  config.url.includes('/health');
        
        if (isLoggedIn && token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`✅ [API] Token attached to ${config.url}`);
            return config;
        }

        if (config.url.includes('/auth/login')) {
            return config;
        }
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`✅ [API] Token attached to ${config.url}`);
        } else {
            console.warn(`⚠️ [API] No token for ${config.url}`);
            
            if (!isPublicEndpoint) {
                console.warn('🔴 [API] No token, redirecting to login...');
                window.location.href = '/login';
                return Promise.reject(new Error('No token'));
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        console.log(`📥 [API] Response OK: ${response.config.url}`);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 307) {
            console.warn(`🔄 [API] 307 Redirect for ${originalRequest.url}`);
            const newUrl = error.response.headers.location;
            if (newUrl) {
                console.log(`➡️ [API] Redirecting to ${newUrl}`);
                originalRequest.url = newUrl;
                const token = localStorage.getItem("access_token");
                if (token) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return api(originalRequest);
            }
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            console.warn(`🔴 [API] 401 Unauthorized for ${originalRequest.url}`);
            
            if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh')) {
                console.warn('🔴 [API] Auth endpoint failed, redirecting to login...');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            const isLoginPage = window.location.pathname.includes('/login');
            if (isLoginPage) {
                console.log('⏭️ [API] 401 on login page, ignoring...');
                return Promise.reject(error);
            }
            
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => Promise.reject(err));
            }
            
            originalRequest._retry = true;
            isRefreshing = true;
            
            try {
                const refreshToken = localStorage.getItem("refresh_token");
                console.log(`🔄 [API] Attempting refresh token...`);
                
                if (!refreshToken) {
                    console.warn('🔴 [API] No refresh token!');
                    throw new Error("No refresh token");
                }
                
                const response = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    { refresh_token: refreshToken }
                );
                
                const { access_token, refresh_token } = response.data;
                console.log(`✅ [API] Token refreshed successfully`);
                
                localStorage.setItem("access_token", access_token);
                localStorage.setItem("refresh_token", refresh_token);
                
                processQueue(null, access_token);
                
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error('🔴 [API] Refresh token failed:', refreshError);
                processQueue(refreshError, null);
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("isAuthenticated");
                localStorage.removeItem("aksara_current_user");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        
        if (error.response) {
            console.error(`🔴 [API] Error ${error.response.status}: ${error.config.url}`);
        }
        
        return Promise.reject(error);
    }
);

export default api;