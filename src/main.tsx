import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Login from './pages/Login.tsx'
import LandingPage from './pages/landing.tsx';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";

import Dashboard from './pages/Dashboard.tsx';
import TestDoctype from './pages/TestDoctype.tsx';
import UserDetails from './pages/UserDetails.tsx';
// import { Link } from 'lucide-react';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "",
        element: <LandingPage />,
      },
      {
        path: "dashboard",
        element:<Dashboard />,
      },
      {
        path: "task",
        element: <div>Task</div>,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "test-doctype",
        element: <TestDoctype />,
      },
      {
        path: "users/:userName",
        element: <UserDetails />,
      }
    ],
  },
],
{
  basename: import.meta.env.VITE_BASE_PATH || '',
});


createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
