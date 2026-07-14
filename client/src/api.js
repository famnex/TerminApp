import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.DEV ? '/api' : '/termin/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
