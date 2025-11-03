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
import ProjectRegistration from './pages/projectRegistration.tsx';
import Endorsement from './pages/Endorsement.tsx';
import AddFundSanction from './pages/AddFundSanction.tsx';
import AddReceivedFunds from './pages/AddReceivedFunds.tsx';
import { UserCreation } from './pages/UserCreation.tsx'; // This one was correct as named
import UserList from './pages/UserList.tsx';
import ProjectsView from './pages/ProjectsView.tsx';
import ProjectDetails from './pages/ProjectDetails.tsx'; // Import ProjectDetails
import HRPortal from './pages/HRPortal.tsx';
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
        {
          path: "project-registration",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User"> {/* Adjust role as needed */}
              <ProjectRegistration />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "endorsement",
          element: (
            <AuthRouteWrapper allowedRole="Permanent Employee"> {/* Adjust role as needed */}
              <Endorsement />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "add-fund-sanction",
          element: (
            <AuthRouteWrapper allowedRole="Permanent Employee"> {/* Adjust role as needed */}
              <AddFundSanction />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "add-received-funds",
          element: (
            <AuthRouteWrapper allowedRole="non-permanent"> {/* Adjust role as needed */}
              <AddReceivedFunds />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "user-creation",
          element: (
            <AuthRouteWrapper allowedRole="non-permanent"> {/* Adjust role as needed */}
              <UserCreation />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "user-list",
          element: (
            <AuthRouteWrapper allowedRole="non-permanent"> {/* Adjust role as needed */}
              <UserList />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "projects-view",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User"> {/* Adjust role as needed */}
              <ProjectsView />
            </AuthRouteWrapper>
          ),
        },
        // Add other routes here, wrapping them with AuthRouteWrapper if they need protection
        // {
        {
          path: "project-details/:projectName",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User"> {/* Adjust role as needed */}
              <ProjectDetails />
            </AuthRouteWrapper>
          ),
        },
        // {
        //   path: "test-doctype",
        //   element: <TestDoctype />,
        // },
        {
          path: "hr-portal",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User"> {/* Adjust role as needed */}
              <HRPortal />
            </AuthRouteWrapper>
          ),
        },
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
