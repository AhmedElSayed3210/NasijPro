# Textile Factory ERP System

نظام إدارة موارد المؤسسة لمصانع النسيج - A comprehensive ERP system for textile factory management, optimized for manufacturing services and profit-sharing machine ownership.

## 🎯 Features

### Core Functionality
- **Shareholder Management**: Manage machine owners and their profit-sharing agreements.
- **Manufacturing Clients**: Track service clients billed by production weight.
- **Machine Management**: Track factory-owned and shareholder-owned machines with custom profit ratios.
- **Production Records**: Support for weight-based logging (**kg/ton/piece**) and unit pricing.
- **Finance & Accounting**: Track manufacturing income, operational expenses, and shareholder payouts.
- **Advanced Reporting**: Automated monthly analytics with fair expense allocation and uptime tracking.

### Business Logic
- **Profit Sharing**:
  - Factory-owned machines: 100% profit to factory.
  - Shareholder-owned machines: Configurable ratio (e.g., 60% Factory / 40% Shareholder).
- **Weight-Based Billing**: Revenue calculated as `Quantity * Unit Price`, ideal for textile manufacturing.
- **Expense Allocation**: Shared overheads (salaries, utilities) distributed based on actual machine activity (working days).
- **Uptime Tracking**: Detailed status logs for calculating utilization and efficiency.

### Technical Features
- **Offline Support**: LocalStorage fallback ensures system availability during network issues.
- **RTL Interface**: Full Arabic right-to-left UI designed for ease of use.
- **Responsive Design**: Modern dashboard optimized for desktops and tablets.
- **Data Visualization**: Dynamic charts for financial and operational performance.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### 2. Installation
```bash
# Clone the repository
cd d:\Personal\private\project

# Setup Backend
cd backend
npm install
cp .env.example .env # Configure your DB credentials

# Setup Frontend
cd ../frontend
npm install
```

### 3. Database Initialization
```bash
# Create database
psql -U postgres -c "CREATE DATABASE textile_erp;"

# Import Schema
psql -U postgres -d textile_erp -f backend/database/schema.sql
```

## � Project Structure

```
project/
├── backend/
│   ├── routes/
│   │   ├── shareholders.js      # Machine owner management
│   │   ├── clients.js           # Manufacturing client management
│   │   ├── machines.js          # Machine registry
│   │   ├── production.js        # Weight-based production logs
│   │   ├── machine_costs.js     # Specific machine overheads
│   │   └── reports.js           # Analytical billing engine
│   └── database/
│       └── schema.sql           # Updated V2 Schema
│
└── frontend/
    └── src/
        └── components/
            ├── Shareholders/    # New Payout tracking UI
            ├── Clients/         # Manufacturing service UI
            ├── Production/      # Weight-based input forms
            └── Reports/         # Analytics dashboard
```

## � Business Rules & Math

### Monthly Net Profit
1. **Gross Revenue**: $\sum(Weight \times Unit Price)$ per machine.
2. **Direct Costs**: Maintenance + dedicated machine expenses/costs.
3. **Overhead Allocation**: $\frac{Total Salaries + Shared Utilities}{Total Active Machine Days} \times Machine Working Days$.
4. **Net Profit**: $Revenue - (Direct Costs + Overhead)$.
5. **Settlement**: Distributed based on the per-machine `factory_profit_percentage`.

## 🌐 Offline Mode
The system uses a robust **LocalStorage Fallback**. Every transaction and record is cached locally, allowing the factory to continue logging production even if the server connection drops. Data is automatically refreshed upon restoration.

## 🎨 UI & Aesthetics
- **Premium Design**: Dark-mode glassmorphism accents with vibrant status indicators.
- **High Performance**: Optimized React components with minimal re-renders.
- **Print Friendly**: Dedicated PDF export for monthly reports via `html2pdf.js`.

---

**Built with ❤️ for Modern Textile Factory Management**


Project Run Walkthrough
I have successfully set up and started the NasijPro project.

1. Database Setup
Validated PostgreSQL configuration.
Created textile_erp database (it was missing).
Imported the schema from 
backend/database/schema.sql
.
Updated 
backend/.env
 to connect to textile_erp.
2. Backend
Installed dependencies (npm install).
Started the server (npm start).
URL: http://localhost:3001
3. Frontend
Installed dependencies (npm install).
Started the development server (npm run dev).
URL: http://localhost:5173/
Next Steps
You can access the application at http://localhost:5173/. The backend API is running at http://localhost:3001.

