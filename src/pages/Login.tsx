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
      <div className="w-full h-screen bg-[#F7F8FA] flex flex-col justify-between items-center overflow-hidden">
        {isLoggedIn ? (
          <>
            <div className="w-full flex justify-between items-center p-4 bg-white shadow-md">
              <img
                src="/frontend/rndops_Logo.svg"
                alt="R&D Operations Logo"
                className="w-[166px] h-[60px]"
              />
              <div className="flex items-center gap-4">
                {/* <AppSidebar /> */}
                <SidebarTrigger />
                <span className="text-gray-600">Welcome, {currentUser}</span>
                <Button
                  className="h-10 px-4 rounded-xl"
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
          <div className="w-[700px] flex flex-col justify-start items-center gap-12 my-auto p-12 bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
            <div className="w-full flex flex-col items-center gap-4">
              <img
                src="/rndops_Logo.svg"
                alt="R&D Operations Logo"
                className="w-[200px] h-auto"
              />
              <div className="text-xl font-semibold text-gray-900 border-b-2 border-gray-900 pb-2">
                Research and Development Cell
              </div>
            </div>

            <div className="w-full flex flex-col items-center gap-9">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="w-full flex flex-col items-center gap-6"
              >
                <div className="flex flex-col gap-2 w-full">
                  <label className="font-semibold text-gray-900" htmlFor="username">Username</label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border-2 border-gray-900 rounded-lg shadow-[1px_1px_0px_rgba(0,0,0,0.1)] focus:ring-2 focus:ring-slate-600 focus:outline-none transition-all duration-150"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label className="font-semibold text-gray-900" htmlFor="password">Password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-2 border-gray-900 rounded-lg shadow-[1px_1px_0px_rgba(0,0,0,0.1)] focus:ring-2 focus:ring-slate-600 focus:outline-none transition-all duration-150"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 mt-4 bg-slate-600 text-white font-semibold text-lg border-2 border-slate-600 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:bg-slate-700 hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.15)] transition-all duration-150"
                >
                  Log In
                </Button>
              </form>

              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="font-semibold text-gray-900 hover:underline decoration-2 underline-offset-4"
                >
                  Forgot password?
                </a>
                <span className="text-gray-900 font-semibold">|</span>
                <span className="text-gray-900">
                  Reset here.
                </span>
              </div>
              {error && (
                <div className="w-full p-4 bg-red-100 border border-gray-300 rounded-lg text-red-800 font-semibold">
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
