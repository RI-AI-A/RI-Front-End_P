# Retail Intelligence Frontend Dashboard

A modern, real-time dashboard for the Retail Intelligence Platform. Built with React (Vite), TypeScript, Tailwind CSS, and Recharts.

## 🚀 Features

-   **Real-time KPI Monitoring**: Visualizes Traffic, Conversion, and Congestion trends.
-   **Situation Alerts**: Instantly notifies of detected operational issues (e.g., Crowding).
-   **Smart Recommendations**: Displays actionable advice from the Decision Engine.
-   **Task Actions**: One-click approval to turn recommendations into tracked tasks.
-   **AI Chat Assistant**: Integrated chat widget to query the system using natural language.

## 🛠️ Setup & Run

### 1. Install Dependencies
```bash
cd retail-intel-frontend
npm install
```

### 2. Configure Backends
For the dashboard to work, you must run the backend services on specific ports so the proxy can connect to them:

-   **CV Backend**: Port **8000**
    ```bash
    # In retail-intel-cv-backend/
    uvicorn api_service.main:app --host 0.0.0.0 --port 8000
    ```

-   **NLP Backend**: Port **8001**
    ```bash
    # In retail-intel-nlp-backend/
    uvicorn api_service.main:app --host 0.0.0.0 --port 8001
    ```

### 3. Start Dashboard
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📦 Project Structure
-   `src/App.tsx`: Main dashboard logic and UI.
-   `src/components/`: Reusable UI components.
-   `vite.config.ts`: Proxy configuration for backend API connection.
