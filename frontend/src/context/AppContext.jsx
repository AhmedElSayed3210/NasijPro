import { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';
import { localStorageService } from '../services/localStorage';

const AppContext = createContext();

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isOnline, setIsOnline] = useState(true);
    const [machines, setMachines] = useState([]);
    const [shareholders, setShareholders] = useState([]);
    const [clients, setClients] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [operations, setOperations] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [production, setProduction] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initial session restoration
    useEffect(() => {
        const savedUser = localStorage.getItem('textile_erp_user');
        const savedToken = localStorage.getItem('textile_erp_token');
        if (savedUser && savedToken) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    // Load data when user changes or becomes active
    useEffect(() => {
        if (user) {
            loadAllData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [
                machinesData,
                shareholdersData,
                clientsData,
                employeesData,
                operationsData,
                maintenanceData,
                productionData,
                transactionsData
            ] = await Promise.all([
                api.machinesAPI.getAll(),
                api.shareholdersAPI.getAll(),
                api.clientsAPI.getAll(),
                api.employeesAPI.getAll(),
                api.operationsAPI.getAll(),
                api.maintenanceAPI.getAll(),
                api.productionAPI.getAll(),
                api.transactionsAPI.getAll(),
            ]);

            setMachines(machinesData);
            setShareholders(shareholdersData);
            setClients(clientsData);
            setEmployees(employeesData);
            setOperations(operationsData);
            setMaintenance(maintenanceData);
            setProduction(productionData);
            setTransactions(transactionsData);

            // Save to localStorage for offline access
            localStorageService.setMachines(machinesData);
            localStorageService.setShareholders(shareholdersData);
            localStorageService.setClients(clientsData);
            localStorageService.setEmployees(employeesData);
            localStorageService.setOperations(operationsData);
            localStorageService.setMaintenance(maintenanceData);
            localStorageService.setProduction(productionData);
            localStorageService.setTransactions(transactionsData);

            setIsOnline(true);
            setError(null);
        } catch (error) {
            if (error.message.includes('401') || error.message.includes('403') || error.message.includes('انتهت صلاحية الجلسة')) {
                handleLogout();
            } else {
                console.error('Failed to load data from API, using localStorage:', error);
                setError('فشل الاتصال بالخادم. يتم استخدام البيانات المحلية حالياً.');
                // Fallback to localStorage
                setMachines(localStorageService.getMachines());
                setShareholders(localStorageService.getShareholders());
                setClients(localStorageService.getClients());
                setEmployees(localStorageService.getEmployees());
                setOperations(localStorageService.getOperations());
                setMaintenance(localStorageService.getMaintenance());
                setProduction(localStorageService.getProduction());
                setTransactions(localStorageService.getTransactions());
                setIsOnline(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (userData, token) => {
        localStorage.setItem('textile_erp_token', token);
        localStorage.setItem('textile_erp_user', JSON.stringify(userData));
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('textile_erp_token');
        localStorage.removeItem('textile_erp_user');
        setUser(null);
        // Reset all data state
        setMachines([]);
        setShareholders([]);
        setClients([]);
        setEmployees([]);
        setOperations([]);
        setMaintenance([]);
        setProduction([]);
        setTransactions([]);
    };

    const value = {
        user,
        handleLogin,
        handleLogout,
        isOnline,
        loading,
        machines,
        setMachines,
        shareholders,
        setShareholders,
        clients,
        setClients,
        employees,
        setEmployees,
        operations,
        setOperations,
        maintenance,
        setMaintenance,
        production,
        setProduction,
        transactions,
        setTransactions,
        refreshData: loadAllData,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
