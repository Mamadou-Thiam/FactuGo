import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password });

// Clients
export const getClients = (search?: string) =>
  api.get('/clients', { params: { search } });
export const getClient = (id: number) => api.get(`/clients/${id}`);
export const createClient = (data: { name: string; phone: string; address?: string }) =>
  api.post('/clients', data);
export const updateClient = (id: number, data: { name: string; phone: string; address?: string }) =>
  api.put(`/clients/${id}`, data);
export const deleteClient = (id: number) => api.delete(`/clients/${id}`);

// Invoices
export const getInvoices = () => api.get('/invoices');
export const getInvoice = (id: number) => api.get(`/invoices/${id}`);
export const getNextInvoiceNumber = () => api.get('/invoices/next-number');
export const createInvoice = (data: any) => api.post('/invoices', data);
export const updateInvoice = (id: number, data: any) => api.put(`/invoices/${id}`, data);
export const deleteInvoice = (id: number) => api.delete(`/invoices/${id}`);

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// PDF
export const getInvoicePdfUrl = (id: number) => `${API_URL}/pdf/${id}/pdf`;

export async function downloadPdf(invoiceId: number, fileName: string): Promise<void> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/pdf/${invoiceId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erreur lors du téléchargement');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

export async function getInvoicePdfBlob(invoiceId: number): Promise<Blob> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/pdf/${invoiceId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erreur lors du téléchargement');
  return res.blob();
}

export default api;
