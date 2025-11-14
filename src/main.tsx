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
import ProjectRegistration from './pages/ProjectRegistration.tsx';
import Endorsement from './pages/Endorsement.tsx';
import AddFundSanction from './pages/AddFundSanction.tsx';
// import AddReceivedFunds from './pages/AddReceivedFunds.tsx';
// import { UserCreation } from './pages/UserCreation.tsx'; // This one was correct as named
// import UserList from './pages/UserList.tsx';
import ProjectsView from './pages/ProjectsView.tsx';
import ProjectDetails from './pages/ProjectDetails.tsx'; // Import ProjectDetails
import ProjectDetailsOverview from './pages/ProjectDetailsOverview.tsx';
import HRPortal from './pages/HRPortal.tsx';
import AddFundReceived from './pages/AddFundReceived.tsx';
import { HosRndDashboard } from './pages/dashboards/HosRndDashboard.tsx';
import { DorndDashboard } from './pages/dashboards/DorndDashboard.tsx';
import { HeadDashboard } from './pages/dashboards/HeadDashboard.tsx';
import { RndStaffDashboard } from './pages/dashboards/RndStaffDashboard.tsx';
import { ProjectStaffDashboard } from './pages/dashboards/ProjectStaffDashboard.tsx';
import { DirectorDashboard } from './pages/dashboards/DirectorDashboard.tsx';
import Reimbursement from './pages/reimbursement/Reimbursement.tsx';
import DynamicFormPage from './pages/DynamicFormPage.tsx'; // Import DynamicFormPage
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
        // {
        //   path: "project-details-overview:projectName/add-fund-sanctiond",
        //   element: (
        //     <AuthRouteWrapper allowedRole="Permanent Employee"> {/* Adjust role as needed */}
        //       <AddFundReceived />
        //     </AuthRouteWrapper>
        //   ),
        // },
        {
          path: "add-fund-received/:projectName/",
          element: (
            <AuthRouteWrapper allowedRole="Permanent Employee"> {/* Adjust role as needed */}
              <AddFundReceived />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "hos-rnd",
          element: (
            <AuthRouteWrapper allowedRole="Hos, RnD (Head of Section, RnD)"> {/* Adjust role as needed */}
              <HosRndDashboard />
            </AuthRouteWrapper>
          ),
        },
        // {
        //   path: "user-list",
        //   element: (
        //     <AuthRouteWrapper allowedRole="non-permanent"> {/* Adjust role as needed */}
        //       <UserList />
        //     </AuthRouteWrapper>
        //   ),
        // },
        {
          path: "projects-view",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User"> {/* Adjust role as needed */}
              <ProjectsView />
            </AuthRouteWrapper>
          ),
        },
        {
          // This is the parent route for the APPROVED project view
          path: "project-details-overview/:projectName",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <ProjectDetailsOverview />
            </AuthRouteWrapper>
          ),
        },
        
        // --- THIS IS THE KEY CHANGE ---
        {
          // This is now a nested route. The URL will be /project-details-overview/:projectName/add-fund-sanction
          path: "project-details-overview/:projectName/add-fund-sanction",
          element: (
            <AuthRouteWrapper allowedRole="Permanent Employee">
              <AddFundSanction />
            </AuthRouteWrapper>
          ),
        },
        // --- END OF CHANGE ---

        // Your other project details route for non-approved projects
        {
          path: "project-details/:projectName",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <ProjectDetails /> 
            </AuthRouteWrapper>
          ),
        },
        {
          path: "director-dashboard",
          element: (
            <AuthRouteWrapper allowedRole="Director">
              <DirectorDashboard />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "dean-dashboard",
          element: (<AuthRouteWrapper allowedRole="Dean, RnD"><DorndDashboard /></AuthRouteWrapper>),
        },
        {
          path: "head-dashboard",
          element: (<AuthRouteWrapper allowedRole="head_approver_1"><HeadDashboard /></AuthRouteWrapper>),
        },
        {
          path: "hos-rnd-dashboard", // Renamed for clarity
          element: (<AuthRouteWrapper allowedRole="Hos, RnD (Head of Section, RnD)"><HosRndDashboard /></AuthRouteWrapper>),
        },
        {
          path: "rnd-staff-dashboard",
          element: (<AuthRouteWrapper allowedRole="staff, RnD"><RndStaffDashboard /></AuthRouteWrapper>),
        },
        {
          path: "project-staff-dashboard",
          element: (<AuthRouteWrapper allowedRole="project staff"><ProjectStaffDashboard /></AuthRouteWrapper>),
        },
        {
          path: "hr-portal",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User"> {/* Adjust role as needed */}
              <HRPortal />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "reimbursement", 
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <Reimbursement />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "dynamic-form/:doctype_name",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User"> {/* Adjust role as needed */}
              <DynamicFormPage /> {/* doctype_name will be passed via URL param */}
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
