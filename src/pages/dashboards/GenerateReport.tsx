import * as React from "react";
import InstituteReportingModule from "./InstituteReportingModule";
import { useFrappeGetDocList, useFrappeGetCall, useFrappeAuth } from "frappe-react-sdk";
import { Loader2 } from "lucide-react";

export default function GenerateReport() {
    const { currentUser } = useFrappeAuth();

    const { data: userDoc } = useFrappeGetDocList("User", {
        fields: ["full_name"],
        filters: [["email", "=", currentUser || ""]],
    });
    const fullName = userDoc?.[0]?.full_name || currentUser;

    const { data: deptList } = useFrappeGetDocList("Department_prornd", {
        fields: ["name", "dept_name"],
        limit: 5000,
    });

    const { data: standardDeptList } = useFrappeGetDocList("Department", {
        fields: ["name", "department_name"],
        limit: 5000,
    });

    const getDeptName = React.useCallback(
        (idOrName: string) => {
            if (!idOrName) return "—";
            
            if (deptList) {
                const found = deptList.find(
                    (d: any) => d.name === idOrName || d.dept_name === idOrName
                );
                if (found) return found.dept_name;
            }

            if (standardDeptList) {
                const foundStd = standardDeptList.find(
                    (d: any) => d.name === idOrName || d.department_name === idOrName
                );
                if (foundStd) return foundStd.department_name;
            }

            // Fallbacks for legacy/orphaned hashes
            if (idOrName === "hgdri9hvfq") {
                return "Jyoti and Bhupat Mehta School of Health Sciences and Technology";
            }
            
            return idOrName;
        },
        [deptList, standardDeptList]
    );

    // Fetch dashboard data for project overview (ongoing, submitted)
    const { data: dashboardData, isLoading: dashboardLoading } = useFrappeGetCall<{
        message: {
            project_overview: {
                ongoing_project_nos: string[];
                submitted_project_nos: string[];
            }
        }
    }>("rndopsapp.dashboard.get_director_dashboard_data");

    // Fetch all projects for reporting
    const { data: allProjectsList, isLoading: projectsLoading } = useFrappeGetDocList(
        "Project Registration",
        {
            fields: [
                "name",
                "project_no",
                "project_title",
                "pi_webmail",
                "implementation_department",
                "workflow_state",
                "project_type",
                "origin_of_funding_agency",
                "select_funding_agency",
                "funding_agency_other",
                "total_budget_amount",
                "grand_total_proposal",
                "prj_start_date",
                "prj_end_date",
                "project_duration_months",
                "sanctioned_letter_date",
                "funding_agen",
                "funding_agen.funding_agency_name",
                "funding_agency_schemes",
                "scheme_name",
                "creation"
            ],
            limit: 5000,
        }
    );

    const { data: usersData } = useFrappeGetDocList("User", {
        fields: ["email", "full_name"],
        limit: 5000,
    });

    const emailToNameMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        if (usersData) {
            usersData.forEach((u: any) => {
                if (u.email && u.full_name) {
                    map[u.email.toLowerCase().trim()] = u.full_name.trim();
                }
            });
        }
        return map;
    }, [usersData]);

    const getPiName = React.useCallback(
        (email: string) => {
            if (!email) return "—";
            const lcEmail = email.toLowerCase().trim();
            let rawName = emailToNameMap[lcEmail];
            if (!rawName) {
                const username = lcEmail.split("@")[0];
                rawName = username.charAt(0).toUpperCase() + username.slice(1);
            }
            return rawName.split(/\s+/).filter((word, pos, arr) => 
                pos === 0 || word.toLowerCase() !== arr[pos - 1].toLowerCase()
            ).join(" ");
        },
        [emailToNameMap]
    );

    const ongoingIds = React.useMemo(() => {
        return new Set<string>(dashboardData?.message?.project_overview?.ongoing_project_nos || []);
    }, [dashboardData]);

    const submittedIds = React.useMemo(() => {
        return new Set<string>(dashboardData?.message?.project_overview?.submitted_project_nos || []);
    }, [dashboardData]);

    const isLoading = dashboardLoading || projectsLoading;
    const allProjects = allProjectsList || [];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto w-full">
            <InstituteReportingModule 
                projects={allProjects}
                getDeptName={getDeptName} 
                getPiName={getPiName}
                ongoingIds={ongoingIds}
                submittedIds={submittedIds}
                printedBy={fullName}
                isLoadingProjects={isLoading}
            />
        </div>
    );
}
