import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = () => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();


  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'reli Projects', path: '/projects', icon: FolderKanban },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-black text-blue-600 tracking-tight flex items-center gap-1">
            reli<span className="text-slate-800">Ai</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Reliability Monitoring</p>
        </div>

        <div className="p-4">
          <Link to="/projects/new" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white 
          py-2 rounded-lg transition-colors font-medium text-sm">
            + Create Project
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Icon size={20} className={isActive ? 'text-blue-600' : 'text-slate-500'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-sm text-slate-500 flex justify-between items-center">
          <p>Version 1.0</p>
          <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">
            {navItems.find(item => location.pathname === item.path)?.name || 'reli Project Details'}
          </h2>

          <div className="flex items-center gap-4">

            <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 pr-2 rounded-full transition-colors">
              {currentUser?.picture ? (
                <img src={currentUser.picture} alt="Profile" className="w-8 h-8 rounded-full" />
              ) : (
                <UserCircle size={28} className="text-blue-600" />
              )}
              <span className="text-sm font-medium text-slate-700">{currentUser?.name || 'QA Manager'}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
