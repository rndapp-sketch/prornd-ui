import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { cn } from "@/lib/utils";
import { Plus, ArrowLeftIcon } from "lucide-react";
import { GlobalLoader } from "@/components/ui/global-loader";
import { DepartmentName } from "@/components/DepartmentName";

// --- TYPE DEFINITIONS ---
interface DisbursalListItem {
  name: string;
  creation: string;
  workflow_state: string;
  total_amount?: number;
  project_number?: string;
  date_of_request?: string;
  department?: string;
  webmail_id?: string;
  name_of_applicant?: string;
  owner?: string;
}

// --- MAIN DISBURSAL OF HONORARIUM LIST COMPONENT ---
const DisbursalOfHonorarium: React.FC = () => {
  const navigate = useNavigate();
  const [disbursalList, setDisbursalList] = useState<DisbursalListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        '/api/resource/Disbursal of Honorarium?fields=["name","creation","workflow_state","total_amount","project_number","date_of_request","department","webmail_id","name_of_applicant","owner"]&order_by=creation desc&limit_page_length=0',
      );
      const data = await response.json();
      if (data.data) {
        setDisbursalList(data.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return <GlobalLoader isLoading={true} />;
  }

  return (
    <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
        {/* Header */}
        <header className="mb-6 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                  Disbursal of Honorarium
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  View and manage honorarium disbursement applications
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/disbursal-of-honorarium-form")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm",
                "bg-[#D97757] text-white hover:bg-[#D97757]",
                "shadow-sm transition-all duration-150",
              )}
            >
              <Plus className="w-4 h-4" />
              Apply New
            </button>
          </div>
        </header>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {disbursalList.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Plus className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
              </div>
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                No applications yet
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Click "Apply New" to create your first application.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Application ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {disbursalList.map((item) => (
                  <tr
                    key={item.name}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                    onClick={() =>
                      navigate(`/disbursal-of-honorarium/${item.name}`)
                    }
                  >
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(item.date_of_request || item.creation)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {item.name_of_applicant || item.webmail_id || item.owner}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {item.department ? (
                        <DepartmentName name={item.department} />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right font-medium">
                      ₹{(item.total_amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                          item.workflow_state === "Approved" &&
                            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          item.workflow_state === "Rejected" &&
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          item.workflow_state === "Draft" &&
                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
                          (item.workflow_state?.startsWith("Pending") ||
                            false) &&
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          !["Approved", "Rejected", "Draft"].includes(
                            item.workflow_state || "",
                          ) &&
                            !(
                              item.workflow_state?.startsWith("Pending") ||
                              false
                            ) &&
                            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                        )}
                      >
                        {item.workflow_state || "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/disbursal-of-honorarium/${item.name}`);
                        }}
                        className="text-sm text-[#D97757] hover:underline whitespace-nowrap"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default DisbursalOfHonorarium;
