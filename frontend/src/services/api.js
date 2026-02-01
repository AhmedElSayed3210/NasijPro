const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to handle API calls with token
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('textile_erp_token');

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });

        if (response.status === 401 || response.status === 403) {
            // Handle unauthorized access (maybe token expired)
            if (endpoint !== '/auth/login') {
                localStorage.removeItem('textile_erp_token');
                // We don't redirect here to avoid circular dependencies, 
                // the AppContext or components will handle it based on state
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Authentication API
export const authAPI = {
    login: (credentials) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => apiCall('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    // logout is handled on client-side by clearing state/localStorage
};

// User Management API (Admin only)
export const usersAPI = {
    getAll: () => apiCall('/users'),
    updateStatus: (id, status) => apiCall(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    delete: (id) => apiCall(`/users/${id}`, { method: 'DELETE' }),
    getPermissions: (id) => apiCall(`/users/${id}/permissions`),
    updatePermissions: (id, permissions) => apiCall(`/users/${id}/permissions`, { method: 'POST', body: JSON.stringify({ permissions }) }),
};

// Machines API
export const machinesAPI = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/machines${query ? '?' + query : ''}`);
    },
    getById: (id) => apiCall(`/machines/${id}`),
    getHistory: (id) => apiCall(`/machines/${id}/history`),
    create: (data) => apiCall('/machines', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/machines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/machines/${id}`, { method: 'DELETE' }),
    restore: (id) => apiCall(`/machines/${id}/restore`, { method: 'POST' }),
    changeStatus: (id, status) => apiCall(`/machines/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    getStatusLogs: (id) => apiCall(`/machines/${id}/status-logs`),
};

// Shareholders API
export const shareholdersAPI = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/shareholders${query ? '?' + query : ''}`);
    },
    getById: (id) => apiCall(`/shareholders/${id}`),
    getPayouts: (id) => apiCall(`/shareholders/${id}/payouts`),
    create: (data) => apiCall('/shareholders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/shareholders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/shareholders/${id}`, { method: 'DELETE' }),
    restore: (id) => apiCall(`/shareholders/${id}/restore`, { method: 'POST' }),
};

// Clients API (Manufacturing)
export const clientsAPI = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/clients${query ? '?' + query : ''}`);
    },
    getById: (id) => apiCall(`/clients/${id}`),
    getBalance: (id) => apiCall(`/clients/${id}/balance`),
    create: (data) => apiCall('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/clients/${id}`, { method: 'DELETE' }),
    restore: (id) => apiCall(`/clients/${id}/restore`, { method: 'POST' }),
};

// Employees API
export const employeesAPI = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/employees${query ? '?' + query : ''}`);
    },
    getById: (id) => apiCall(`/employees/${id}`),
    create: (data) => apiCall('/employees', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/employees/${id}`, { method: 'DELETE' }),
    restore: (id) => apiCall(`/employees/${id}/restore`, { method: 'POST' }),
};

// Operations API
export const operationsAPI = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/operations${query ? '?' + query : ''}`);
    },
    create: (data) => apiCall('/operations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/operations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/operations/${id}`, { method: 'DELETE' }),
    restore: (id) => apiCall(`/operations/${id}/restore`, { method: 'POST' }),
};

// Maintenance API
export const maintenanceAPI = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/maintenance${query ? '?' + query : ''}`);
    },
    create: (data) => apiCall('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/maintenance/${id}`, { method: 'DELETE' }),
    restore: (id) => apiCall(`/maintenance/${id}/restore`, { method: 'POST' }),
};

// Production API
export const productionAPI = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/production${query ? '?' + query : ''}`);
    },
    create: (data) => apiCall('/production', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/production/${id}`, { method: 'DELETE' }),
    restore: (id) => apiCall(`/production/${id}/restore`, { method: 'POST' }),
};

// Machine Costs API
export const machineCostsAPI = {
    getByMachine: (machineId, params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/machine-costs/machine/${machineId}${query ? '?' + query : ''}`);
    },
    getVariable: (machineId, year, month) => apiCall(`/machine-costs/machine/${machineId}/variable/${year}/${month}`),
    create: (data) => apiCall('/machine-costs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/machine-costs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/machine-costs/${id}`, { method: 'DELETE' }),
    restore: (id) => apiCall(`/machine-costs/${id}/restore`, { method: 'POST' }),
};

// Transactions API
export const transactionsAPI = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/transactions${query ? '?' + query : ''}`);
    },
    create: (data) => apiCall('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/transactions/${id}`, { method: 'DELETE' }),
    restore: (id) => apiCall(`/transactions/${id}/restore`, { method: 'POST' }),
};

// Reports API
export const reportsAPI = {
    getMonthly: (year, month) => apiCall(`/reports/monthly/${year}/${month}`),
    getMachineReport: (id, year, month) => apiCall(`/reports/machine/${id}/${year}/${month}`),
};

// Dashboard API
export const dashboardAPI = {
    getSummary: () => apiCall('/dashboard/summary'),
    getEfficiency: () => apiCall('/dashboard/efficiency'),
    getRecentTransactions: (limit = 5) => apiCall(`/dashboard/recent-transactions?limit=${limit}`),
};
