import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Database, LayoutDashboard, KeyRound } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  // Get the redirect path if the user was trying to access a protected route
  const from = location.state?.from?.pathname || "/";

  const handleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      login(decoded);
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError("Failed to process Google Login.");
    }
  };

  const handleFailure = () => {
    setError("Google Sign-In was unsuccessful. Try again later.");
  };

  const handleBypass = (customName) => {
    // Mock user for testing purposes
    login({
      sub: `mock-user-${Date.now()}`,
      name: customName || "Test User",
      email: `${(customName || "Test User").toLowerCase().replace(/\s+/g, '.')}@kampus.ac.id`,
      picture: ""
    });
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600 mb-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center gap-2">
            <span className="bg-blue-600 text-white p-2 rounded-xl"><Database size={24} /></span>
            <span className="text-2xl font-bold tracking-wide">QA CoreMetrics</span>
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Integrated Quality Assurance Information System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-2xl sm:px-10 border border-slate-100">

          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              <ShieldCheck className="text-blue-500 mb-3" size={32} />
              <p className="text-sm text-center text-slate-600 mb-6">
                Securely authenticate using your Google Account to access dashboards or submit testing forms.
              </p>

              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleFailure}
                useOneTap
                theme="filled_blue"
                shape="rectangular"
                text="continue_with"
                size="large"
              />

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 text-center w-full">
                  {error}
                </p>
              )}
            </div>



            <div className="mt-6 text-center text-xs text-slate-500">
              By logging in, you agree to the Terms of Service and Privacy Policy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
