// ==================

import React, { useState } from 'react';
import { useParams } from "react-router";
import { useFrappeGetDoc } from "frappe-react-sdk";
import { User, Mail, Edit, MessageSquare, Shield, Building, Briefcase, Clock, Globe, CheckCircle, XCircle } from 'lucide-react';

// --- Helper Components ---

// A reusable component for displaying a detail item with an icon
const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined | null }) => (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
        <Icon className="h-5 w-5 text-gray-500 mt-1" />
        <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-base text-gray-800">{value || 'N/A'}</p>
        </div>
    </div>
);

// --- Main Component ---

const UserDetails = () => {
    const { userName } = useParams();
    const { data: user, isLoading, error } = useFrappeGetDoc("User", userName, {
        fields: [
            'name',
            'full_name',
            'user_image',
            'username',
            'employee_id',
            'department_name',
            'designation_name',
            'empclass',
            'language',
            'time_zone',
            'enabled',
            'roles'
        ]
    });
    console.log("userdetails:",user)
    const [activeTab, setActiveTab] = useState('details');

    // Skeleton loader for when data is being fetched
    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 md:p-8 bg-gray-100 min-h-screen">
                <div className="animate-pulse max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-md space-y-4 text-center">
                            <div className="h-32 w-32 rounded-full bg-gray-200 mx-auto"></div>
                            <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mt-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full mx-auto mt-2"></div>
                            <div className="h-10 bg-gray-200 rounded-lg mt-6"></div>
                            <div className="h-10 bg-gray-200 rounded-lg mt-3"></div>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <div className="flex space-x-2 p-2 border-b">
                                <div className="h-10 w-24 bg-gray-200 rounded-md"></div>
                                <div className="h-10 w-32 bg-gray-200 rounded-md"></div>
                            </div>
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[...Array(9)].map((_, i) => (
                                    <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg max-w-md mx-auto mt-10">Error: {error.message}</div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg max-w-md mx-auto mt-10">User not found.</div>;
    }

    const renderDetailsTab = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <DetailItem icon={Mail} label="Email" value={user.name} />
            <DetailItem icon={User} label="Username" value={user.username} />
            <DetailItem icon={Briefcase} label="Employment ID" value={user.employee_id} />
            <DetailItem icon={Building} label="Department" value={user.department_name} />
            <DetailItem icon={Briefcase} label="Designation" value={user.designation_name} />
            <DetailItem icon={User} label="Employee Class" value={user.empclass} />
            <DetailItem icon={Globe} label="Language" value={user.language} />
            <DetailItem icon={Clock} label="Time Zone" value={user.time_zone} />
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                {user.enabled ? <CheckCircle className="h-5 w-5 text-green-500 mt-1" /> : <XCircle className="h-5 w-5 text-red-500 mt-1" />}
                <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className={`text-base font-semibold ${user.enabled ? 'text-green-600' : 'text-red-600'}`}>
                        {user.enabled ? "Enabled" : "Disabled"}
                    </p>
                </div>
            </div>
        </div>
    );

    const renderRolesTab = () => (
        <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Assigned Roles</h3>
            <div className="flex flex-wrap gap-3">
                {user.roles?.map((role: { name: string, role: string }) => (
                    <div key={role.name} className="flex items-center bg-indigo-100 text-indigo-800 text-sm font-medium px-4 py-2 rounded-full">
                        <Shield className="h-4 w-4 mr-2" />
                        {role.role}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-6 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: User Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-md p-6 text-center">
                        <img
                            src={user.user_image}
                            alt={user.full_name}
                            className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'https://placehold.co/128x128/E0E7FF/4F46E5?text=NA';
                            }}
                        />
                        <h1 className="text-2xl font-bold text-gray-800">{user.full_name}</h1>
                        <p className="text-sm text-gray-500 mb-6">{user.name}</p>
                        
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                            </button>
                            <button className="w-full flex items-center justify-center bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Tabbed Content */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-md">
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-2 p-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                                        activeTab === 'details'
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('roles')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                                        activeTab === 'roles'
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Roles & Permissions
                                </button>
                            </nav>
                        </div>
                        <div className="p-6">
                            {activeTab === 'details' && renderDetailsTab()}
                            {activeTab === 'roles' && renderRolesTab()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetails;
