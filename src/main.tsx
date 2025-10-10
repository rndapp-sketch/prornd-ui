import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { FrappeProvider } from 'frappe-react-sdk';

import './index.css';

// Import Components and Pages
import App from './App.tsx';
import Login from './pages/Login.tsx';
import LandingPage from './pages/landing.tsx';
import Home from './pages/Home.tsx';
import PiHomePage from './pages/PiHomePage.tsx';
import Dashboard from './pages/Dashboard.tsx';
import AuthRouteWrapper from './components/AuthRouteWrapper.tsx';
// Add any other page imports you need
// import TestDoctype from './pages/TestDoctype.tsx';
// import UserDetails from './pages/UserDetails.tsx';

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />, // Your main layout component (with navbar, etc.)
      children: [
        {
          path: "",
          element: <LandingPage />, // Public landing page
        },
        {
          path: "login",
          element: <Login />,
        },
        {
          // This is the main entry point after login, which handles redirection
          // AuthRouteWrapper is removed here as Dashboard itself handles role-based redirection
          path: "dashboard",
          element: <Dashboard />,
        },
        {
          // Protected route for non-permanent employees
          path: "home",
          element: (
            <AuthRouteWrapper allowedRole="non-permanent">
              <Home />
            </AuthRouteWrapper>
          ),
        },
        {
          // Protected route for Permanent Employees
          path: "pihomepage",
          element: (
            <AuthRouteWrapper allowedRole="Permanent Employee">
              <PiHomePage />
            </AuthRouteWrapper>
          ),
        },
        // Add other routes here, wrapping them with AuthRouteWrapper if they need protection
        // {
        //   path: "test-doctype",
        //   element: <TestDoctype />,
        // },
      ],
    },
  ],
  {
    basename: import.meta.env.VITE_BASE_PATH || '',
  }
);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <FrappeProvider url={import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000'}>
      <RouterProvider router={router} />
    </FrappeProvider>
  </StrictMode>
);
