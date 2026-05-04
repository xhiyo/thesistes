import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in via localStorage
    const userStr = localStorage.getItem('qa_auth_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    // userData from Google JWT (name, email, picture, sub/id)
    const user = {
      id: userData.sub,
      name: userData.name,
      email: userData.email,
      picture: userData.picture,
      // For this prototype, we'll auto-assign Admin role if their email ends in a specific domain, 
      // or we can just let them choose in a real app. Let's make everyone Admin for the dashboard, 
      // EXCEPT when they are specifically accessing a /test/:id link, in which case they act as a Tester.
    };
    setCurrentUser(user);
    localStorage.setItem('qa_auth_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('qa_auth_user');
  };

  const value = {
    currentUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
