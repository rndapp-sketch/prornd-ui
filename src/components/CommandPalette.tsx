import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    SearchIcon,
    FileTextIcon,
    LayoutDashboardIcon,
    UsersIcon,
    ClipboardListIcon,
    FolderIcon,
    CreditCardIcon,
    XIcon,
    ArrowRightIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from './UserRole';

interface SearchItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ElementType;
    path: string;
    category: 'navigation' | 'action' | 'recent';
    keywords?: string[];
    allowedRoles?: string[];
}

const OVERVIEW_ROLES = ['Director', 'Dean, RnD', 'Ado_RnD', 'Hos, RnD (Head of Section, RnD)'];
const PENDING_TASK_ROLES = [...OVERVIEW_ROLES, 'head_approver_1', 'staff, RnD'];
const TASK_REGISTRY_ROLES = ['staff, RnD', 'Hos, RnD (Head of Section, RnD)', 'Dean, RnD', 'Director', 'head_approver_1'];
const PAYMENT_ROLES = ['staff, RnD', 'Hos, RnD (Head of Section, RnD)'];
const PROJECT_MENU_ROLES = ['Permanent Employee', 'head_approver_1', 'Dean, RnD'];
const SUPERUSER_ROLES = ['Administrator', 'System Manager'];

// Define all searchable navigation items
const SEARCH_ITEMS: SearchItem[] = [
    // Dashboards
    { id: 'dashboard', label: 'Dashboard', description: 'Main dashboard view', icon: LayoutDashboardIcon, path: '/dashboard', category: 'navigation', keywords: ['home', 'main'] },
    { id: 'pi-home', label: 'PI Home', description: 'Principal Investigator homepage', icon: LayoutDashboardIcon, path: '/pihomepage', category: 'navigation', keywords: ['principal', 'investigator'], allowedRoles: ['Permanent Employee'] },
    { id: 'home', label: 'Home', description: 'Home page', icon: LayoutDashboardIcon, path: '/home', category: 'navigation', keywords: ['landing'] },
    { id: 'overview', label: 'Overview', description: 'Institution project overview', icon: LayoutDashboardIcon, path: '/director-dashboard?view=Director', category: 'navigation', keywords: ['director', 'dean', 'ado', 'hos', 'overview'], allowedRoles: OVERVIEW_ROLES },
    { id: 'department-overview', label: 'Departments', description: 'Department-wise project overview', icon: LayoutDashboardIcon, path: '/director-dashboard?view=Department', category: 'navigation', keywords: ['department', 'director', 'dean', 'overview'], allowedRoles: OVERVIEW_ROLES },
    { id: 'overview-pi-projects', label: 'PI Projects', description: 'PI-wise project overview', icon: LayoutDashboardIcon, path: '/director-dashboard?view=PI', category: 'navigation', keywords: ['pi', 'projects', 'overview'], allowedRoles: OVERVIEW_ROLES },
    { id: 'head-overview', label: 'Head Overview', description: 'Department head overview', icon: LayoutDashboardIcon, path: '/head-overview?view=Overview', category: 'navigation', keywords: ['head', 'hod', 'overview'], allowedRoles: ['head_approver_1'] },
    { id: 'head-pi-projects', label: 'Head PI Projects', description: 'PI projects for department head', icon: LayoutDashboardIcon, path: '/head-overview?view=PI', category: 'navigation', keywords: ['head', 'pi', 'projects'], allowedRoles: ['head_approver_1'] },

    // Projects
    { id: 'projects', label: 'Projects View', description: 'View all projects', icon: FolderIcon, path: '/projects-view', category: 'navigation', keywords: ['project', 'list', 'all'], allowedRoles: PROJECT_MENU_ROLES },
    { id: 'project-registration', label: 'Project Registration', description: 'Register a new project', icon: FileTextIcon, path: '/project-registration', category: 'navigation', keywords: ['new', 'create', 'register'], allowedRoles: PROJECT_MENU_ROLES },
    { id: 'project-proposal', label: 'Project Proposal', description: 'Submit project proposal', icon: FileTextIcon, path: '/project-proposal', category: 'navigation', keywords: ['proposal', 'submit'] },
    { id: 'project-analytics', label: 'Project Analytics', description: 'View project analytics', icon: LayoutDashboardIcon, path: '/project-analytics', category: 'navigation', keywords: ['analytics', 'stats', 'charts'] },
    { id: 'stakeholder-registration', label: 'Stakeholder Registration', description: 'Register stakeholders and agencies', icon: FileTextIcon, path: '/universal-registration', category: 'navigation', keywords: ['stakeholder', 'agency', 'registration', 'universal'] },

    // Tasks
    { id: 'pending-tasks', label: 'Pending Tasks', description: 'View pending approvals', icon: ClipboardListIcon, path: '/pending-task', category: 'navigation', keywords: ['tasks', 'pending', 'approval', 'workflow'], allowedRoles: PENDING_TASK_ROLES },
    { id: 'task-registry', label: 'Task Registry', description: 'View workflow task registry', icon: ClipboardListIcon, path: '/task-registry', category: 'navigation', keywords: ['task', 'registry', 'workflow'], allowedRoles: TASK_REGISTRY_ROLES },

    // Finance
    { id: 'payments', label: 'Payments', description: 'Review and process payments', icon: CreditCardIcon, path: '/payments', category: 'navigation', keywords: ['payment', 'finance', 'paid'], allowedRoles: PAYMENT_ROLES },
    { id: 'add-fund-sanction', label: 'Add Fund Sanction', description: 'Add new fund sanction', icon: CreditCardIcon, path: '/add-fund-sanction', category: 'navigation', keywords: ['fund', 'sanction', 'budget', 'finance'], allowedRoles: ['Permanent Employee'] },

    // HR
    { id: 'hr-portal', label: 'HR Portal', description: 'Human Resources portal', icon: UsersIcon, path: '/hr-portal', category: 'navigation', keywords: ['hr', 'human', 'resources', 'staff'] },

    // Reimbursement
    { id: 'reimbursement', label: 'Reimbursement', description: 'Submit reimbursement request', icon: CreditCardIcon, path: '/reimbursement', category: 'navigation', keywords: ['reimburse', 'expense', 'claim'] },

    // Director Dashboard
    { id: 'director-dashboard', label: 'Director Dashboard', description: 'Director view', icon: LayoutDashboardIcon, path: '/director-dashboard', category: 'navigation', keywords: ['director'], allowedRoles: OVERVIEW_ROLES },

    // HoS R&D
    { id: 'hos-rnd', label: 'HoS R&D', description: 'Head of Section R&D', icon: LayoutDashboardIcon, path: '/hos-rnd', category: 'navigation', keywords: ['hos', 'rnd', 'section'], allowedRoles: ['Hos, RnD (Head of Section, RnD)'] },
    { id: 'hos-rnd-dashboard', label: 'HoS R&D Dashboard', description: 'HoS R&D dashboard view', icon: LayoutDashboardIcon, path: '/hos-rnd-dashboard', category: 'navigation', keywords: ['hos', 'rnd', 'dashboard'], allowedRoles: ['Hos, RnD (Head of Section, RnD)'] },

    // Staff Dashboards
    { id: 'rnd-staff-dashboard', label: 'R&D Staff Dashboard', description: 'R&D Staff view', icon: LayoutDashboardIcon, path: '/rnd-staff-dashboard', category: 'navigation', keywords: ['rnd', 'staff'], allowedRoles: ['staff, RnD'] },
    { id: 'project-staff-dashboard', label: 'Project Staff Dashboard', description: 'Project Staff view', icon: LayoutDashboardIcon, path: '/project-staff-dashboard', category: 'navigation', keywords: ['project', 'staff'], allowedRoles: ['project staff'] },

    // Head Dashboard
    { id: 'head-dashboard', label: 'Head Dashboard', description: 'Head of Department view', icon: LayoutDashboardIcon, path: '/head-dashboard', category: 'navigation', keywords: ['head', 'hod', 'department'], allowedRoles: ['head_approver_1'] },
    { id: 'ado-rnd-dashboard', label: 'ADO R&D Dashboard', description: 'ADO R&D dashboard view', icon: LayoutDashboardIcon, path: '/ado-rnd-dashboard', category: 'navigation', keywords: ['ado', 'rnd', 'dashboard'], allowedRoles: ['Ado_RnD'] },
    { id: 'director-pdf-upload', label: 'Upload Director PDF', description: 'Upload director approval PDF', icon: FileTextIcon, path: '/director-pdf-upload', category: 'navigation', keywords: ['director', 'pdf', 'upload'], allowedRoles: ['staff, RnD'] },
];

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    const roleFilteredItems = useMemo(() => {
        if (!currentUser) return [];
        const hasSuperuserAccess = roles.some(role => SUPERUSER_ROLES.includes(role));

        return SEARCH_ITEMS.filter(item => {
            if (!item.allowedRoles?.length) return true;
            return hasSuperuserAccess || item.allowedRoles.some(role => roles.includes(role));
        });
    }, [currentUser, roles]);

    // Filter items based on search query
    const filteredItems = roleFilteredItems.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.label.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.keywords?.some(k => k.toLowerCase().includes(query))
        );
    });

    // Group items by category
    const groupedItems = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, SearchItem[]>);

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            setSearchQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (filteredItems.length === 0) return;
                setSelectedIndex(i => (i + 1) % filteredItems.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (filteredItems.length === 0) return;
                setSelectedIndex(i => (i - 1 + filteredItems.length) % filteredItems.length);
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                    navigate(filteredItems[selectedIndex].path);
                    onClose();
                }
                break;
            case 'Escape':
                onClose();
                break;
        }
    }, [filteredItems, selectedIndex, navigate, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Command Palette Modal */}
            <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <SearchIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search pages, forms, or actions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-base text-zinc-900 dark:text-zinc-100 font-medium placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
                    />
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <XIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto py-2">
                    {filteredItems.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <SearchIcon className="h-8 w-8 mx-auto mb-2 text-zinc-400 dark:text-zinc-500" />
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No results found for "{searchQuery}"</p>
                        </div>
                    ) : (
                        <>
                            {Object.entries(groupedItems).map(([category, items]) => (
                                <div key={category}>
                                    <div className="px-4 py-2">
                                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                            {category === 'navigation' ? 'Pages' : category === 'action' ? 'Actions' : 'Recent'}
                                        </span>
                                    </div>
                                    {items.map((item) => {
                                        const globalIndex = filteredItems.indexOf(item);
                                        const isSelected = globalIndex === selectedIndex;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    navigate(item.path);
                                                    onClose();
                                                }}
                                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                                    isSelected ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center border",
                                                    isSelected ? "bg-[#D97757] text-white border-[#D97757]" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                                                )}>
                                                    <item.icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "text-sm font-medium truncate",
                                                        isSelected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"
                                                    )}>
                                                        {item.label}
                                                    </p>
                                                    {item.description && (
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <ArrowRightIcon className="h-4 w-4 text-[#D97757] flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Footer with keyboard hints */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs font-mono text-zinc-500 dark:text-zinc-400">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs font-mono text-zinc-500 dark:text-zinc-400">↓</kbd>
                            <span className="ml-1">Navigate</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs font-mono text-zinc-500 dark:text-zinc-400">↵</kbd>
                            <span className="ml-1">Open</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs font-mono text-zinc-500 dark:text-zinc-400">Esc</kbd>
                            <span className="ml-1">Close</span>
                        </span>
                    </div>
                    <span>{filteredItems.length} results</span>
                </div>
            </div>
        </div>
    );
};

// Hook to manage command palette state
export const useCommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        isOpen,
        openPalette: () => setIsOpen(true),
        closePalette: () => setIsOpen(false),
    };
};

export default CommandPalette;
