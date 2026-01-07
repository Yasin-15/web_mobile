import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Adjust if needed
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor to include token
api.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
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
