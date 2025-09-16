import React, { useState } from 'react';
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

  const handleSubmit = () => {
    setError(null);
    login({ username, password })
      .then(() => {
        console.log('Login successful');
        navigate('/dashboard');
      })
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
          <div className="w-[700px] flex flex-col justify-start items-center gap-12 my-auto">
            <div className="w-full flex justify-between items-end">
              <img
                src="/rndops_Logo.svg"
                alt="R&D Operations Logo"
                className="w-[166px] h-[60px]"
              />
              <div className="pb-[3px] flex items-center gap-2 overflow-hidden">
                <div className="title-text">
                  Research and Development Cell Automation Software
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col items-end gap-9">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="w-full flex items-center gap-6"
              >
                <div className="flex flex-col gap-1 w-[400px]">
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1 w-[400px]">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="h-10 px-4 rounded-xl"
                >
                  Log in
                </Button>
              </form>

              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="forgot-password-text text-blue-600 underline"
                >
                  Forgot password?
                </a>
                <span className="reset-here-text text-gray-600">
                  Reset here.
                </span>
              </div>
              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            </div>
          </div>
        )}

        <Footer />
      </div>
    </SidebarProvider>
  );
};

export default Login;
