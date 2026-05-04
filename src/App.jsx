import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import CreateProject from './pages/CreateProject';
import ProjectDetail from './pages/ProjectDetail';
import TesterForm from './pages/TesterForm';
import Settings from './pages/Settings';
import Login from './pages/Login';
import './App.css';

// Use the real Client ID from .env
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1041933618381-mockclientidforprototypingonly.apps.googleusercontent.com";

// Protected Route Wrapper
const RequireAuth = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Standalone Layout for Testers (No Sidebar)
const StandaloneLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm">
        <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
          <span className="bg-blue-600 text-white p-1 rounded-md text-sm">QA</span>
          Testing Portal
        </h1>
      </header>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

import { useEffect } from 'react';

function App() {
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* QA Admin Routes (With Sidebar) */}
            <Route path="/" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/new" element={<CreateProject />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Tester Routes (Standalone, Public Access, No Sidebar) */}
            <Route path="/test" element={<StandaloneLayout />}>
              <Route path=":id" element={<TesterForm />} />
            </Route>

          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
