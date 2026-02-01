# Textile Factory ERP System - Implementation Plan

## Business Analysis & Requirements

### Core Business Problem
A small textile factory needs to track machine-level profitability with different ownership models:
- **Factory-owned machines**: 100% profit to factory
- **Client-owned machines**: 50/50 profit split after expenses

### Key Business Rules
1. Monthly accounting cycle with per-machine calculations
2. Shared expenses (salaries, electricity) must be allocated across machines
3. Direct expenses (maintenance, materials) tracked per machine
4. Revenue tracked per machine
5. Automated profit sharing calculations for client settlements

---

## System Architecture Overview

### Technology Stack
- **Frontend**: React 19 + Vite + Tailwind CSS (RTL) + Recharts
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **State Management**: React Context API
- **Offline Support**: LocalStorage fallback

---

## Database Schema Design

### Core Entities

#### 1. **machines**
```sql
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_number VARCHAR(50) UNIQUE NOT NULL,
  machine_type VARCHAR(100) NOT NULL,
  owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('FACTORY', 'CLIENT')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'STOPPED', 'MAINTENANCE')),
  start_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **customers**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **employees**
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  monthly_salary DECIMAL(15,2) NOT NULL,
  hire_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. **operations**
```sql
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  operation_date DATE NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(machine_id, operation_date)
);
```

#### 5. **maintenance**
```sql
CREATE TABLE maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  maintenance_type VARCHAR(20) NOT NULL CHECK (maintenance_type IN ('ROUTINE', 'URGENT')),
  cost DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. **sales**
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(15,2) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sale_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. **transactions**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_date DATE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 8. **expense_allocations** (New - for tracking shared expenses)
```sql
CREATE TABLE expense_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_type VARCHAR(50) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  allocation_month DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Core Business Logic

### Monthly Profit Calculation Algorithm

#### Step 1: Calculate Total Revenue per Machine
```javascript
const machineRevenue = await db.query(`
  SELECT machine_id, SUM(total_amount) as total_revenue
  FROM sales
  WHERE EXTRACT(YEAR FROM sale_date) = $1 
    AND EXTRACT(MONTH FROM sale_date) = $2
  GROUP BY machine_id
`, [year, month]);
```

#### Step 2: Calculate Direct Expenses per Machine
```javascript
// Maintenance costs
const maintenanceCosts = await db.query(`
  SELECT machine_id, SUM(cost) as total_maintenance
  FROM maintenance
  WHERE EXTRACT(YEAR FROM maintenance_date) = $1 
    AND EXTRACT(MONTH FROM maintenance_date) = $2
  GROUP BY machine_id
`, [year, month]);

// Machine-specific expenses from transactions
const directExpenses = await db.query(`
  SELECT machine_id, SUM(amount) as total_expenses
  FROM transactions
  WHERE transaction_type = 'EXPENSE'
    AND machine_id IS NOT NULL
    AND EXTRACT(YEAR FROM transaction_date) = $1 
    AND EXTRACT(MONTH FROM transaction_date) = $2
  GROUP BY machine_id
`, [year, month]);
```

#### Step 3: Allocate Shared Expenses
```javascript
// Get active machines count for the month
const activeMachinesCount = await getActiveMachinesCount(year, month);

// Calculate shared expenses (salaries, electricity, rent)
const totalSalaries = await getTotalMonthlySalaries();
const sharedExpenses = await getSharedExpenses(year, month);

const totalSharedExpenses = totalSalaries + sharedExpenses;
const expensePerMachine = totalSharedExpenses / activeMachinesCount;
```

#### Step 4: Calculate Net Profit per Machine
```javascript
for (const machine of machines) {
  const revenue = machineRevenue[machine.id] || 0;
  const directExpense = (maintenanceCosts[machine.id] || 0) + 
                        (directExpenses[machine.id] || 0);
  const allocatedExpense = expensePerMachine;
  
  const totalExpenses = directExpense + allocatedExpense;
  const netProfit = revenue - totalExpenses;
  
  // Apply profit sharing logic
  let factoryShare, clientShare;
  
  if (machine.owner_type === 'FACTORY') {
    factoryShare = netProfit;
    clientShare = 0;
  } else { // CLIENT-owned
    factoryShare = netProfit * 0.5;
    clientShare = netProfit * 0.5;
  }
  
  monthlyReport.push({
    machine_id: machine.id,
    machine_number: machine.machine_number,
    owner_type: machine.owner_type,
    revenue,
    direct_expenses: directExpense,
    allocated_expenses: allocatedExpense,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    factory_share: factoryShare,
    client_share: clientShare,
    customer_name: machine.customer_name
  });
}
```

---

## API Endpoints Design

### Machine Management
- `GET /api/machines` - List all machines
- `POST /api/machines` - Create new machine
- `PUT /api/machines/:id` - Update machine
- `DELETE /api/machines/:id` - Delete machine
- `GET /api/machines/:id/history` - Get machine operation history

### Customer Management
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/:id/statement` - Get customer account statement
- `GET /api/customers/:id/balance` - Get current balance

### Employee Management
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Operations
- `GET /api/operations` - List operations (with filters)
- `POST /api/operations` - Log operation
- `PUT /api/operations/:id` - Update operation
- `DELETE /api/operations/:id` - Delete operation

### Maintenance
- `GET /api/maintenance` - List maintenance records
- `POST /api/maintenance` - Create maintenance record
- `PUT /api/maintenance/:id` - Update maintenance
- `DELETE /api/maintenance/:id` - Delete maintenance

### Sales
- `GET /api/sales` - List sales
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Reports & Analytics
- `GET /api/reports/monthly/:year/:month` - Get monthly profit report
- `GET /api/reports/machine/:id/:year/:month` - Get machine-specific report
- `GET /api/dashboard/summary` - Get dashboard summary
- `GET /api/dashboard/efficiency` - Get machine efficiency data

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── Dashboard/
│   │   ├── SummaryCards.jsx
│   │   ├── EfficiencyChart.jsx
│   │   ├── FinancialChart.jsx
│   │   └── RecentTransactions.jsx
│   ├── Machines/
│   │   ├── MachineList.jsx
│   │   ├── MachineForm.jsx
│   │   └── MachineHistory.jsx
│   ├── Customers/
│   │   ├── CustomerList.jsx
│   │   ├── CustomerForm.jsx
│   │   └── CustomerStatement.jsx
│   ├── Operations/
│   │   ├── OperationLog.jsx
│   │   └── OperationForm.jsx
│   ├── Maintenance/
│   │   ├── MaintenanceList.jsx
│   │   └── MaintenanceForm.jsx
│   ├── Sales/
│   │   ├── SalesList.jsx
│   │   └── SalesForm.jsx
│   ├── Finance/
│   │   ├── TransactionList.jsx
│   │   └── TransactionForm.jsx
│   └── Reports/
│       ├── MonthlyReport.jsx
│       └── MachineReport.jsx
├── context/
│   └── AppContext.jsx
├── services/
│   ├── api.js
│   └── localStorage.js
└── App.jsx
```

### State Management Strategy
- **AppContext** will manage global state for all entities
- Automatic fallback to LocalStorage when API is unavailable
- Optimistic UI updates with error handling

---

## Implementation Phases

### Phase 1: Backend Foundation
1. Set up Express server with PostgreSQL connection
2. Create database schema and migrations
3. Implement all CRUD API endpoints
4. Add business logic for profit calculations

### Phase 2: Frontend Foundation
1. Set up React + Vite project with Tailwind CSS
2. Configure RTL support
3. Implement AppContext and API service layer
4. Add LocalStorage fallback mechanism

### Phase 3: Core Modules
1. Build Dashboard with analytics
2. Implement Machine Management
3. Implement Customer Management
4. Implement Employee Management

### Phase 4: Operations & Finance
1. Build Operations logging
2. Build Maintenance tracking
3. Build Sales module
4. Build Finance/Transactions module

### Phase 5: Reporting & Polish
1. Implement monthly profit reports
2. Implement machine-specific reports
3. Add customer settlement calculations
4. UI/UX refinements and Arabic localization

### Phase 6: Authentication & Security
1. Implement JWT-based authentication
2. Add Role-Based Access Control (Admin vs. Employee)
3. Build user registration and approval workflow
4. Create User Management dashboard for Factory Owner

---

## Verification Plan

### Automated Tests
1. Test all API endpoints using Postman/Thunder Client
2. Verify profit calculation logic with sample data
3. Test expense allocation algorithm
4. Verify customer balance calculations

### Manual Verification
1. Create sample data (4 machines, 3 employees, 2 customers)
2. Log operations, maintenance, and sales for a month
3. Generate monthly report and verify calculations manually
4. Test offline mode by stopping the server
5. Verify data persistence in LocalStorage
6. Test Arabic RTL layout on different screen sizes

### Test Scenarios
- **Scenario 1**: Factory-owned machine with revenue and expenses
- **Scenario 2**: Client-owned machine with 50/50 profit split
- **Scenario 3**: Mixed month with multiple machines, shared expenses
- **Scenario 4**: Customer with multiple transactions and balance calculation
