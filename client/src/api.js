import axios from 'axios';

const api = axios.create({
    baseURL: '/launcher/termin_new/server/public/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
