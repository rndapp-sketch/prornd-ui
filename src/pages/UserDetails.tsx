// ==================

import React, { useState } from 'react';
import { useParams } from "react-router";
import { useFrappeGetDoc } from "frappe-react-sdk";
import { User, Mail, Edit, MessageSquare, Shield, Building, Briefcase, Clock, Globe, CheckCircle, XCircle } from 'lucide-react';

// --- Helper Components ---

// A reusable component for displaying a detail item with an icon
const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined | null }) => (
    <div className="flex items-start space-x-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <Icon className="h-5 w-5 text-zinc-500 dark:text-zinc-400 mt-1" />
        <div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
            <p className="text-base text-zinc-800 dark:text-zinc-200">{value || 'N/A'}</p>
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
    const [activeTab, setActiveTab] = useState('details');

    // Skeleton loader for when data is being fetched
    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 md:p-8 bg-zinc-100 dark:bg-zinc-800 min-h-screen">
                <div className="animate-pulse w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-md space-y-4 text-center">
                            <div className="h-32 w-32 rounded-full bg-zinc-200 dark:bg-zinc-700 mx-auto"></div>
                            <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 mx-auto mt-4"></div>
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full mx-auto mt-2"></div>
                            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg mt-6"></div>
                            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg mt-3"></div>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-md">
                            <div className="flex space-x-2 p-2 border-b">
                                <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-md"></div>
                                <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-700 rounded-md"></div>
                            </div>
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[...Array(9)].map((_, i) => (
                                    <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
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
        return <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg max-w-md mx-auto mt-10">User not found.</div>;
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
            <div className="flex items-start space-x-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                {user.enabled ? <CheckCircle className="h-5 w-5 text-green-500 mt-1" /> : <XCircle className="h-5 w-5 text-red-500 mt-1" />}
                <div>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Status</p>
                    <p className={`text-base font-semibold ${user.enabled ? 'text-green-600' : 'text-red-600'}`}>
                        {user.enabled ? "Enabled" : "Disabled"}
                    </p>
                </div>
            </div>
        </div>
    );

    const renderRolesTab = () => (
        <div>
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Assigned Roles</h3>
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
        <div className="bg-zinc-100 dark:bg-zinc-800 min-h-screen p-4 sm:p-6 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: User Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6 text-center">
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
                        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{user.full_name}</h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{user.name}</p>

                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                            </button>
                            <button className="w-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold py-2 px-4 rounded-lg hover:bg-zinc-300 dark:bg-zinc-600 transition duration-300">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Tabbed Content */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md">
                        <div className="border-b border-zinc-200 dark:border-zinc-800">
                            <nav className="flex space-x-2 p-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeTab === 'details'
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800'
                                        }`}
                                >
                                    Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('roles')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeTab === 'roles'
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800'
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
