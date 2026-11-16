import axios from 'axios';

// 1. Apuntamos todo al API Gateway
const api = axios.create({
    baseURL: 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json'
    }
});

// 2. Interceptamos las peticiones para inyectar el token si existe
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('practicasHubToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;