import React from 'react';
import Editor from '../components/Editor';
import { AppSidebar } from "../components/RndSidebar";
import UserRoleCheck from "../components/UserRoleCheck"; // Import UserRoleCheck

const Endorsement: React.FC = () => {
  const isPermanentEmployee = UserRoleCheck() ?? false; // Use the UserRoleCheck component and provide a default value

  return (
    <div className="flex">
      {/* Sidebar */}
      <AppSidebar isPermanentEmployee={isPermanentEmployee} />

      {/* Main Content */}
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold mb-4">Endorsement</h1>
        <Editor />
      </div>
    </div>
  );
};

export default Endorsement;
