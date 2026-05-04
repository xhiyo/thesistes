import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, UserCircle2, MoonStar, ShieldCheck, Mail, Fingerprint } from 'lucide-react';

const Settings = () => {
  const { currentUser } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const handleDarkModeToggle = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="text-blue-600" />
          System Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account details, visual preferences, and critical system data controls.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Account & UI Settings */}
        <div className="lg:col-span-2 space-y-6">

          {/* Account Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
              <UserCircle2 className="text-blue-600" size={20} />
              Identity Profile
            </h3>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-24 h-24 rounded-full p-1 border-2 border-slate-200 bg-slate-50">
                {currentUser?.picture ? (
                  <img src={currentUser.picture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <UserCircle2 size={40} className="text-slate-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-4">
                  <div className="text-slate-500"><Fingerprint size={20} /></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase">Full Name</p>
                    <p className="text-sm font-semibold text-slate-800">{currentUser?.name || 'Administrator'}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-4">
                  <div className="text-slate-500"><Mail size={20} /></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase">Email Address</p>
                    <p className="text-sm font-semibold text-slate-800">{currentUser?.email || 'admin@coremetrics.app'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
              <SettingsIcon className="text-blue-600" size={20} />
              Interface Toggles
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="text-slate-500"><MoonStar size={20} /></div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Dark Theme</p>
                    <p className="text-xs text-slate-500">Switch to a darker interface palette.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={handleDarkModeToggle} />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: AI & Danger Zone */}
        <div className="space-y-6">



          {/* Info Badge */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <ShieldCheck size={16} />
              System Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 text-sm">Version</span>
                <span className="font-semibold text-slate-700 text-sm">1.0.0-rc</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 text-sm">Storage</span>
                <span className="font-semibold text-blue-600 text-sm">Firebase Cloud</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Framework</span>
                <span className="font-semibold text-slate-700 text-sm">React + Vite</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
