import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.BACKEND_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;