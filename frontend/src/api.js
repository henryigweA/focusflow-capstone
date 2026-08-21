import axios from 'axios';

// Relative path on purpose: works with the Vite dev proxy locally,
// and will work with the nginx reverse proxy once this is deployed —
// the browser never needs to know the backend's actual host or port.
const api = axios.create({
  baseURL: '/api',
});

export default api;
