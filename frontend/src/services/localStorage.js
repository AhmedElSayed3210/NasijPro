// LocalStorage service for offline fallback
const STORAGE_KEYS = {
    MACHINES: 'textile_erp_machines',
    SHAREHOLDERS: 'textile_erp_shareholders',
    CLIENTS: 'textile_erp_clients',
    EMPLOYEES: 'textile_erp_employees',
    OPERATIONS: 'textile_erp_operations',
    MAINTENANCE: 'textile_erp_maintenance',
    PRODUCTION: 'textile_erp_production',
    TRANSACTIONS: 'textile_erp_transactions',
};

export const localStorageService = {
    // Generic get/set methods
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    },

    // Entity-specific methods
    getMachines() {
        return this.get(STORAGE_KEYS.MACHINES) || [];
    },

    setMachines(machines) {
        return this.set(STORAGE_KEYS.MACHINES, machines);
    },

    getShareholders() {
        return this.get(STORAGE_KEYS.SHAREHOLDERS) || [];
    },

    setShareholders(shareholders) {
        return this.set(STORAGE_KEYS.SHAREHOLDERS, shareholders);
    },

    getClients() {
        return this.get(STORAGE_KEYS.CLIENTS) || [];
    },

    setClients(clients) {
        return this.set(STORAGE_KEYS.CLIENTS, clients);
    },

    getEmployees() {
        return this.get(STORAGE_KEYS.EMPLOYEES) || [];
    },

    setEmployees(employees) {
        return this.set(STORAGE_KEYS.EMPLOYEES, employees);
    },

    getOperations() {
        return this.get(STORAGE_KEYS.OPERATIONS) || [];
    },

    setOperations(operations) {
        return this.set(STORAGE_KEYS.OPERATIONS, operations);
    },

    getMaintenance() {
        return this.get(STORAGE_KEYS.MAINTENANCE) || [];
    },

    setMaintenance(maintenance) {
        return this.set(STORAGE_KEYS.MAINTENANCE, maintenance);
    },

    getProduction() {
        return this.get(STORAGE_KEYS.PRODUCTION) || [];
    },

    setProduction(production) {
        return this.set(STORAGE_KEYS.PRODUCTION, production);
    },

    getTransactions() {
        return this.get(STORAGE_KEYS.TRANSACTIONS) || [];
    },

    setTransactions(transactions) {
        return this.set(STORAGE_KEYS.TRANSACTIONS, transactions);
    },

    // Clear all data
    clearAll() {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    },
};
