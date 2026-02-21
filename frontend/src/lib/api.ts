import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если 401 и не повторный запрос
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/admin/login';
      }
    }

    return Promise.reject(error);
  }
);

// =====================================================
// ПУБЛИЧНОЕ API
// =====================================================

/**
 * Активация кода
 */
export async function activateCode(code: string) {
  const response = await api.post('/activate', { code });
  return response.data;
}

/**
 * Получение публичных настроек магазина
 */
export async function getPublicSettings() {
  const response = await api.get('/settings');
  return response.data;
}

// =====================================================
// АУТЕНТИФИКАЦИЯ
// =====================================================

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.success) {
    localStorage.setItem('accessToken', response.data.data.accessToken);
    localStorage.setItem('refreshToken', response.data.data.refreshToken);
  }
  return response.data;
}

export async function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data;
}

// =====================================================
// АДМИН API - КАТЕГОРИИ
// =====================================================

export async function getCategories() {
  const response = await api.get('/admin/categories');
  return response.data;
}

export async function createCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  parentId?: string;
}) {
  const response = await api.post('/admin/categories', data);
  return response.data;
}

export async function updateCategory(id: string, data: Partial<{
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  parentId: string;
}>) {
  const response = await api.put(`/admin/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: string) {
  const response = await api.delete(`/admin/categories/${id}`);
  return response.data;
}

// =====================================================
// АДМИН API - ТОВАРЫ
// =====================================================

export async function getProducts(params?: {
  page?: number;
  limit?: number;
  categoryId?: string;
  status?: string;
  search?: string;
}) {
  const response = await api.get('/admin/products', { params });
  return response.data;
}

export async function getProduct(id: string) {
  const response = await api.get(`/admin/products/${id}`);
  return response.data;
}

export async function createProduct(data: {
  name: string;
  categoryId?: string;
  instructionTemplateId?: string;
  description?: string;
  shortDescription?: string;
  type?: string;
  instruction?: string;
  status?: string;
  isFeatured?: boolean;
}) {
  const response = await api.post('/admin/products', data);
  return response.data;
}

export async function updateProduct(id: string, data: Partial<{
  name: string;
  categoryId: string;
  instructionTemplateId: string;
  description: string;
  shortDescription: string;
  type: string;
  instruction: string;
  status: string;
  isFeatured: boolean;
}>) {
  const response = await api.put(`/admin/products/${id}`, data);
  return response.data;
}

export async function deleteProduct(id: string) {
  const response = await api.delete(`/admin/products/${id}`);
  return response.data;
}

export async function uploadFile(productId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/admin/products/${productId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteFile(id: string) {
  const response = await api.delete(`/admin/files/${id}`);
  return response.data;
}

// =====================================================
// АДМИН API - ИНСТРУКЦИИ
// =====================================================

export async function getInstructions(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const response = await api.get('/admin/instructions', { params });
  return response.data;
}

export async function createInstruction(data: {
  title: string;
  content?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const response = await api.post('/admin/instructions', data);
  return response.data;
}

export async function updateInstruction(id: string, data: Partial<{
  title: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
}>) {
  const response = await api.put(`/admin/instructions/${id}`, data);
  return response.data;
}

export async function deleteInstruction(id: string) {
  const response = await api.delete(`/admin/instructions/${id}`);
  return response.data;
}

// =====================================================
// АДМИН API - КОДЫ
// =====================================================

export async function getCodes(params?: {
  page?: number;
  limit?: number;
  productId?: string;
  status?: string;
  search?: string;
}) {
  const response = await api.get('/admin/codes', { params });
  return response.data;
}

export async function generateCodes(data: {
  productId: string;
  count: number;
  prefix?: string;
  length?: number;
  usageLimit?: number;
  expiresInDays?: number;
  codeType?: string;
}) {
  const response = await api.post('/admin/codes/generate', data);
  return response.data;
}

export async function importCodes(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/codes/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function exportCodes(params?: {
  productId?: string;
  status?: string;
}) {
  const response = await api.get('/admin/codes/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
}

export async function blockCode(id: string) {
  const response = await api.post(`/admin/codes/${id}/block`);
  return response.data;
}

export async function unblockCode(id: string) {
  const response = await api.post(`/admin/codes/${id}/unblock`);
  return response.data;
}

// =====================================================
// АДМИН API - СТАТИСТИКА
// =====================================================

export async function getStats() {
  const response = await api.get('/admin/stats');
  return response.data;
}

// =====================================================
// АДМИН API - НАСТРОЙКИ
// =====================================================

export async function getSettings() {
  const response = await api.get('/admin/settings');
  return response.data;
}

export async function updateSettings(settings: Record<string, unknown>) {
  const response = await api.put('/admin/settings', settings);
  return response.data;
}

// =====================================================
// АДМИН API - ЛОГИ
// =====================================================

export async function getLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
}) {
  const response = await api.get('/admin/logs', { params });
  return response.data;
}

export default api;
