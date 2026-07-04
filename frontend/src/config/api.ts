import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    timeout: 120000,
    headers: {
        'Content-Type': 'application/json',
    }
});

const savedToken = localStorage.getItem('accessToken');
if (savedToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

export default api;