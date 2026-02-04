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
import ProjectProposal from './pages/ProjectProposal.tsx';
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
import PendingTask from './pages/PendingTask.tsx';
import PendingTaskDetails from './pages/PendingTaskDetails.tsx';
import DynamicFormPage from './pages/DynamicFormPage.tsx'; // Import DynamicFormPage
import FundReceivedDetails from './pages/FundReceivedDetails.tsx';
import ProjectProposalDetails from './pages/ProjectProposalDetails.tsx';
import EndorsementCertificateView from './pages/EndorsementCertificateView.tsx';
import ProjectAnalytics from './pages/ProjectAnalytics.tsx';
import DepositSlipForm from './pages/DepositSlipForm.tsx';
import DepositSlipDetails from './pages/DepositSlipDetails.tsx';
import TemporaryAdvance from './pages/TemporaryAdvance.tsx';
import ReimbursementDetails from './pages/application/ReimbursementDetails.tsx';
import RateContractForm from './pages/application/RateContractForm.tsx';
import TravelForm from './pages/application/TravelForm.tsx';
import TravelDetails from './pages/application/TravelDetails.tsx';
import TADASettlementForm from './pages/application/TADASettlementForm.tsx';
import ProjectStaffResignationForm from './pages/application/ProjectStaffResignationForm.tsx';
import TaskRegistry from './pages/TaskRegistry.tsx';
import TaskRegistryDetails from './pages/TaskRegistryDetails.tsx';
import TemporaryAdvanceDetails from './pages/application/TemporaryAdvanceDetails.tsx';
import Payments from './pages/Payments.tsx';

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />, // Your main layout component (with navbar, etc.)
      children: [
        {
          path: "temporary-advance/:id",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <TemporaryAdvanceDetails />
            </AuthRouteWrapper>
          ),
        },
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
          path: "project-analytics",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <ProjectAnalytics />
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
          path: "project-proposal",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User"> {/* Adjust role as needed */}
              <ProjectProposal />
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
          path: "project-proposal-details/:name",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <ProjectProposalDetails />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "endorsement-certificate/:name",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <EndorsementCertificateView />
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
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
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
          path: "reimbursement/:id",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <ReimbursementDetails />
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
        {
          path: "pending-task",
          element: (
            <AuthRouteWrapper allowedRole={[
              'Director',
              'Dean, RnD',
              'head_approver_1',
              'Hos, RnD (Head of Section, RnD)',
              'staff, RnD'
            ]}>
              <PendingTask />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "pending-tasks/:doctype/:name",
          element: (
            <AuthRouteWrapper allowedRole={[
              'Director',
              'Dean, RnD',
              'head_approver_1',
              'Hos, RnD (Head of Section, RnD)',
              'staff, RnD'
            ]}>
              <PendingTaskDetails />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "fund-received/:name",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <FundReceivedDetails />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "deposit-slip-new/:fundReceivedName?",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <DepositSlipForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "deposit-slip/:name",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <DepositSlipDetails />
            </AuthRouteWrapper>
          )
        },
        {
          path: "temporary-advance",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <TemporaryAdvance />
            </AuthRouteWrapper>
          )
        },
        {
          path: "rate-contract",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <RateContractForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "travel",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <TravelForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "travel/:docName",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <TravelDetails />
            </AuthRouteWrapper>
          )
        },
        {
          path: "ta-da-settlement",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <TADASettlementForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "project-staff-resignation",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <ProjectStaffResignationForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "task-registry",
          element: (
            <AuthRouteWrapper allowedRole={[
              'staff, RnD',
              'Hos, RnD (Head of Section, RnD)',
              'Dean, RnD',
              'Director'
            ]}>
              <TaskRegistry />
            </AuthRouteWrapper>
          )
        },
        {
          path: "task-registry/:doctype/:name",
          element: (
            <AuthRouteWrapper allowedRole={[
              'staff, RnD',
              'Hos, RnD (Head of Section, RnD)',
              'Dean, RnD',
              'Director'
            ]}>
              <TaskRegistryDetails />
            </AuthRouteWrapper>
          )
        },
        {
          path: "payments",
          element: (
            <AuthRouteWrapper allowedRole={[
              'staff, RnD',
              'Hos, RnD (Head of Section, RnD)',
            ]}>
              <Payments />
            </AuthRouteWrapper>
          )
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
