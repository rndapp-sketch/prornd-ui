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
import ProjectLedgerFull from './pages/ProjectLedgerFull.tsx';
import HRPortal from './pages/HRPortal.tsx';
import AddFundReceived from './pages/AddFundReceived.tsx';
import { HosRndDashboard } from './pages/dashboards/HosRndDashboard.tsx';
import { DorndDashboard } from './pages/dashboards/DorndDashboard.tsx';
import { HeadDashboard } from './pages/dashboards/HeadDashboard.tsx';
import { RndStaffDashboard } from './pages/dashboards/RndStaffDashboard.tsx';
import { ProjectStaffDashboard } from './pages/dashboards/ProjectStaffDashboard.tsx';
import { DirectorDashboard } from './pages/dashboards/DirectorDashboard.tsx';
import { AdoRndDashboard } from './pages/dashboards/AdoRndDashboard.tsx';
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
import AdvanceSettlementForm from './pages/application/AdvanceSettlementForm.tsx';
import AdvanceSettlementDetails from './pages/application/AdvanceSettlementDetails.tsx';
import DisbursalOfHonorarium from './pages/application/DisbursalOfHonorarium.tsx';
import DisbursalOfHonorariumForm from './pages/application/DisbursalOfHonorariumForm.tsx';
import DisbursalOfHonorariumDetails from './pages/application/DisbursalOfHonorariumDetails.tsx';
import DisbursalOfConsultancy from './pages/application/DisbursalOfConsultancy.tsx';
import DisbursalOfConsultancyForm from './pages/application/DisbursalOfConsultancyForm.tsx';
import DirectPurchase from './pages/DirectPurchase.tsx';
import DirectPurchaseDetails from './pages/application/DirectPurchaseDetails.tsx';
import P11Form from './pages/application/P11Form.tsx';
import SanctionSheetForm from './pages/application/SanctionSheetForm.tsx';
import RecruitmentAdhocContractualForm from './pages/application/RecruitmentAdhocContractualForm.tsx';
import IndentCumSanctionSheetForm from './pages/application/IndentCumSanctionSheetForm.tsx';
import UniversalRegistrationForm from './pages/application/UniversalRegistrationForm.tsx';
import UniversalUserForm from './pages/application/UniversalUserForm.tsx';
import DepartmentProjects from './pages/DepartmentProjects.tsx';

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
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
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

        {
          path: "project-ledger-full/:projectName",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <ProjectLedgerFull />
            </AuthRouteWrapper>
          ),
        },

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
          path: "ado-rnd-dashboard",
          element: (<AuthRouteWrapper allowedRole="Ado_RnD"><AdoRndDashboard /></AuthRouteWrapper>),
        },
        {
          path: "department-projects",
          element: (
            <AuthRouteWrapper allowedRole="head_approver_1">
              <DepartmentProjects />
            </AuthRouteWrapper>
          ),
        },
        // {
        //   path: "hr-portal",
        //   element: (
        //     <AuthRouteWrapper allowedRole="staff, RnD"> {/* Adjust role as needed */}
        //       <HRPortal />
        //     </AuthRouteWrapper>
        //   ),
        // },
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
              'Ado_RnD',
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
              'Ado_RnD',
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
          path: "disbursal-of-honorarium",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <DisbursalOfHonorarium />
            </AuthRouteWrapper>
          )
        },
        {
          path: "disbursal-of-honorarium-form/:id?",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <DisbursalOfHonorariumForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "disbursal-of-honorarium/:id",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <DisbursalOfHonorariumDetails />
            </AuthRouteWrapper>
          )
        },
        {
          path: "disbursal-of-consultancy",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <DisbursalOfConsultancy />
            </AuthRouteWrapper>
          )
        },
        {
          path: "disbursal-of-consultancy-form/:id?",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <DisbursalOfConsultancyForm />
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
              'Director',
              'head_approver_1'
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
              'Director',
              'head_approver_1'
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
        {
          path: "advance-settlement",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <AdvanceSettlementForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "advance-settlement/:id",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <AdvanceSettlementDetails />
            </AuthRouteWrapper>
          )
        },
        {
          path: "direct-purchase",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <DirectPurchase />
            </AuthRouteWrapper>
          )
        },
        {
          path: "direct-purchase/:id",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <DirectPurchaseDetails />
            </AuthRouteWrapper>
          )
        },
        {
          path: "p11-form/:id?",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <P11Form />
            </AuthRouteWrapper>
          )
        },
        {
          path: "sanction-sheet/:id?",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <SanctionSheetForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "recruitment-adhoc-contractual/:id?",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <RecruitmentAdhocContractualForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "indent-cum-sanction-sheet/:id?",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <IndentCumSanctionSheetForm />
            </AuthRouteWrapper>
          )
        },
        {
          path: "universal-registration/:id?",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <UniversalRegistrationForm />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "universal-user/:id?",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <UniversalUserForm />
            </AuthRouteWrapper>
          ),
        },
        {
          path: "new-funding-agency",
          element: (
            <AuthRouteWrapper allowedRole="All_ProRnd_User">
              <UniversalRegistrationForm isFundingAgency={true} />
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
