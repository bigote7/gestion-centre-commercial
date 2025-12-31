import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:8081/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si erreur 401 et pas déjà tenté de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Tenter de rafraîchir le token
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        // Sauvegarder les nouveaux tokens
        localStorage.setItem('accessToken', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        // Réessayer la requête originale avec le nouveau token
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh échoué, déconnexion
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

export const authAPI = {
  login: (payload) => apiClient.post('/auth/login', payload),
  register: (payload) => apiClient.post('/auth/register', payload),
  refresh: (payload) => apiClient.post('/auth/refresh', payload),
};

export const ticketAPI = {
  list: (params) => apiClient.get('/tickets', { params }),
  detail: (id) => apiClient.get(`/tickets/${id}`),
  history: (id) => apiClient.get(`/tickets/${id}/history`),
  create: (payload) => apiClient.post('/tickets', payload),
  update: (id, payload) => apiClient.put(`/tickets/${id}`, payload),
  delete: (id) => apiClient.delete(`/tickets/${id}`),
  assign: (id, payload) => {
    // S'assurer que commissionPercentage est bien un nombre
    console.log('apiClient.assign - Payload reçu:', payload);
    if (payload.commissionPercentage !== undefined && payload.commissionPercentage !== null) {
      const commission = parseFloat(payload.commissionPercentage);
      if (!isNaN(commission)) {
        payload.commissionPercentage = commission;
        console.log('apiClient.assign - Commission Percentage converti:', commission);
      } else {
        console.error('apiClient.assign - Erreur: commissionPercentage n\'est pas un nombre valide:', payload.commissionPercentage);
      }
    } else {
      console.error('apiClient.assign - Erreur: commissionPercentage est undefined ou null');
    }
    console.log('apiClient.assign - Payload final avant envoi:', JSON.stringify(payload));
    return apiClient.put(`/tickets/${id}/assign`, payload);
  },
  updateStatus: (id, payload) => apiClient.put(`/tickets/${id}/status`, payload),
  updateAppareilStatus: (id, payload) => apiClient.put(`/tickets/${id}/appareil-status`, payload),
};

export const paymentAPI = {
  listMine: () => apiClient.get('/payments'),
  listAll: () => apiClient.get('/payments/all'),
  listByTicket: (ticketId) => apiClient.get(`/payments/ticket/${ticketId}`),
  create: (payload) => apiClient.post('/payments', payload),
  validate: (paymentId, payload) => apiClient.put(`/payments/${paymentId}/validate`, payload),
};

export const dashboardAPI = {
  snapshot: () => apiClient.get('/dashboard'),
};

export const userAPI = {
  me: () => apiClient.get('/users/me'),
  list: () => apiClient.get('/users'),
  create: (payload) => apiClient.post('/users', payload),
};

export const commissionAPI = {
  getByReparateur: (reparateurId, params) => apiClient.get(`/commissions/reparateur/${reparateurId}`, { params }),
  getSummary: (reparateurId, params) => apiClient.get(`/commissions/reparateur/${reparateurId}/summary`, { params }),
  recordPayment: (reparateurId, payload) => apiClient.post(`/commissions/reparateur/${reparateurId}/payment`, payload),
  getPayments: (reparateurId) => apiClient.get(`/commissions/reparateur/${reparateurId}/payments`),
  // Endpoints pour réparateurs
  getMyPayments: (dateDebut, dateFin) => {
    const params = {};
    if (dateDebut) params.dateDebut = dateDebut;
    if (dateFin) params.dateFin = dateFin;
    console.log('Appel API getMyPayments avec params:', params);
    const url = '/commissions/my-payments';
    console.log('URL complète:', `${API_BASE_URL}${url}`, 'avec params:', params);
    return apiClient.get(url, { params });
  },
  getMySummary: (dateDebut, dateFin) => {
    const params = {};
    if (dateDebut) params.dateDebut = dateDebut;
    if (dateFin) params.dateFin = dateFin;
    console.log('Appel API getMySummary avec params:', params);
    const url = '/commissions/my-summary';
    console.log('URL complète:', `${API_BASE_URL}${url}`, 'avec params:', params);
    return apiClient.get(url, { params });
  },
  // Endpoints pour ADMIN/PROPRIETAIRE
  getPendingPayments: () => apiClient.get('/commissions/pending-payments'),
  payCommission: (commissionId, payload) => apiClient.post(`/commissions/commission/${commissionId}/pay`, payload),
};

