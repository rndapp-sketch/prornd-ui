import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Footer from '@/components/ui/Footer';
import '../index.css';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
// import { AppSidebar } from '@/components/rndSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { currentUser, login, logout } = useFrappeAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(!!currentUser);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   if (currentUser) {
  //     logout().then(() => {
  //       setIsLoggedIn(false);
  //       console.log('Session cleared on login page load.');
  //     });
  //   }
  // }, [currentUser, logout]);

  useEffect(() => {
    if (currentUser) {
      console.log('Login successful');
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleSubmit = () => {
    setError(null);
    login({ username, password })
      .catch((err) => {
        console.error('Login failed:', err);
        setError(err.message || 'An unexpected error occurred.');
      });
  };

  return (
    <SidebarProvider>
      <div className="w-full h-screen bg-[#F0F4F8] flex flex-col justify-between items-center overflow-hidden">
        {isLoggedIn ? (
          <>
            <div className="w-full flex justify-between items-center p-4 bg-white border-b border-gray-200 shadow-sm">
              <img
                src="/frontend/rndops_Logo.svg"
                alt="R&D Operations Logo"
                className="w-[166px] h-[60px]"
              />
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <span className="text-[#6B7280]">Welcome, {currentUser}</span>
                <Button
                  className="h-10 px-4 rounded-full bg-[#0EA5A4] hover:bg-[#0D9494] text-white font-medium"
                  onClick={() => {
                    logout().then(() => {
                      setIsLoggedIn(false);
                      navigate('/login');
                    });
                  }}
                >
                  Log out
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="w-[480px] flex flex-col justify-start items-center gap-10 my-auto p-10 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="w-full flex flex-col items-center gap-4">
              <img
                src="/rndops_Logo.svg"
                alt="R&D Operations Logo"
                className="w-[180px] h-auto"
              />
              <div className="text-lg font-medium text-gray-700">
                Research and Development Cell
              </div>
            </div>

            <div className="w-full flex flex-col items-center gap-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="w-full flex flex-col items-center gap-5"
              >
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="frappe-label" htmlFor="username">Username</label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="frappe-input"
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="frappe-label" htmlFor="password">Password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="frappe-input"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 mt-2 bg-[#0EA5A4] text-white font-medium text-base rounded-full hover:bg-[#0D9494] shadow-sm transition-all duration-150"
                >
                  Log In
                </Button>
              </form>

              <div className="flex items-center gap-3 text-sm">
                <a
                  href="#"
                  className="font-medium text-[#0EA5A4] hover:underline underline-offset-2"
                >
                  Forgot password?
                </a>
                <span className="text-gray-300">|</span>
                <span className="text-[#6B7280]">
                  Reset here.
                </span>
              </div>
              {error && (
                <div className="w-full p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        )
        }

        <Footer />
      </div >
    </SidebarProvider >
  );
};

export default Login;
