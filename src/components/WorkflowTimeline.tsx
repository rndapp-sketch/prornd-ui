import * as React from 'react';

// Define possible statuses for a workflow stage
export type StageStatus = 'completed' | 'in-progress' | 'pending' | 'failed';

// Define the structure for a single workflow stage
export interface IWorkflowStage {
  id: string | number;
  title: string;
  status: StageStatus;
  description?: string; // Optional details for the stage
}

// Define the props for the main timeline component
export interface IWorkflowTimelineProps {
  stages: IWorkflowStage[];
  // Optional prop to change the orientation
  orientation?: 'horizontal' | 'vertical';
}

const getStatusColor = (status: StageStatus) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-600';
    case 'in-progress':
      return 'bg-blue-700';
    case 'pending':
      return 'bg-gray-500';
    case 'failed':
      return 'bg-red-700';
    default:
      return 'bg-gray-500';
  }
};

export const WorkflowTimeline: React.FC<IWorkflowTimelineProps> = ({ stages, orientation = 'horizontal' }) => {
  return (
    <div className={`flex ${orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col'} p-4`}>
      {stages.map((stage, index) => (
        <React.Fragment key={stage.id}>
          <div className={`flex ${orientation === 'horizontal' ? 'flex-col items-center' : 'flex-row items-center space-x-2'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getStatusColor(stage.status)} shadow-sm`}>
              {index + 1}
            </div>
            <div className={`text-center ${orientation === 'horizontal' ? 'mt-2' : 'ml-2'}`}>
              <h4 className="font-bold text-sm text-black uppercase">{stage.title}</h4>
              {stage.description && <p className="text-xs text-gray-900 font-bold">{stage.description}</p>}
            </div>
          </div>
          {index < stages.length - 1 && (
            <div className={`flex-grow ${orientation === 'horizontal' ? 'h-1 bg-gray-400 mx-4' : 'w-1 bg-gray-400 my-4'}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
