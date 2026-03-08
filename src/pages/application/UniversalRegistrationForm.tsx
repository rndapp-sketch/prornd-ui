import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, FileText, CheckCircle2 } from "lucide-react";
import DynamicFormRenderer from "@/components/forms/DynamicFormRenderer";
import { universalRegistrationAPI, prepareFormDataForApi } from "@/services/apiService";
import { Skeleton } from "@/components/ui/skeleton";

export default function UniversalRegistrationForm() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [fields, setFields] = useState<any[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, any[]>>({});
    const [isLoadingFields, setIsLoadingFields] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(id || null);

    // API Hooks
    const { call: getFieldsCall } = useFrappePostCall<{ message: any }>(universalRegistrationAPI.getFields);
    const { call: saveCall } = useFrappePostCall<{ message: any }>(universalRegistrationAPI.save);

    // Fetch Form Configuration based on Document State
    const fetchFormConfiguration = useCallback(async () => {
        setIsLoadingFields(true);
        try {
            const response = await getFieldsCall({ doc_name: savedDocName || undefined });
            if (response && response.message) {
                const { fields: fetchedFields, link_options, prefill_data } = response.message;

                // Set Fields
                setFields(fetchedFields || []);

                // Set Link Options
                setLinkOptions(link_options || {});

                // Default status
                let initialData: any = { status_u_r: "Draft" };

                // Handle Prefill Data (Edit flow)
                if (prefill_data && savedDocName) {
                    initialData = { ...initialData, ...prefill_data };
                }

                setFormData(initialData);
            }
        } catch (error) {
            console.error("Error fetching form configuration:", error);
            alert("Failed to load form configuration.");
        } finally {
            setIsLoadingFields(false);
        }
    }, [savedDocName, getFieldsCall]);

    useEffect(() => {
        let mounted = true;
        fetchFormConfiguration().then(() => {
            if (!mounted) return;
        });
        return () => { mounted = false; };
    }, [fetchFormConfiguration]);

    // Handle single field changes
    const handleFieldChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    // Handle file changes for root fields
    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData((prev) => ({ ...prev, [fieldname]: file }));
    }, []);

    // --- TABLE HANDLERS ---
    const handleTableRowChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, value: any) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };
                }
                return { ...prev, [tableName]: tableData };
            });
        },
        [],
    );

    const handleTableFileChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: file };
                }
                return { ...prev, [tableName]: tableData };
            });
        },
        [],
    );

    const handleAddTableRow = useCallback(
        (tableName: string, newRow: Record<string, any>) => {
            setFormData((prev) => ({
                ...prev,
                [tableName]: [...(prev[tableName] || []), newRow],
            }));
        },
        [],
    );

    const handleDeleteTableRow = useCallback(
        (tableName: string, rowIndex: number) => {
            setFormData((prev) => ({
                ...prev,
                [tableName]: (prev[tableName] || []).filter(
                    (_: any, idx: number) => idx !== rowIndex,
                ),
            }));
        },
        [],
    );

    // Filter out hidden fields
    const HIDDEN_FIELDS = [
        "amended_from",
        "docstatus",
        "naming_series",
        "workflow_state",
    ];
    const filteredFields = (fields || []).filter((f: any) => !HIDDEN_FIELDS.includes(f.fieldname));

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);

        try {
            const preparedData = await prepareFormDataForApi({
                ...formData,
                docname: savedDocName,
            });

            const response = await saveCall({ data: JSON.stringify(preparedData) });

            if (response && response.message) {
                const message = typeof response.message === 'string' ? JSON.parse(response.message) : response.message;

                if (message.status === "success") {
                    setSavedDocName(message.docname);
                    alert(`Universal Registration saved successfully. (ID: ${message.docname})`);

                    // Navigation to edit mode if we were creating a new one
                    if (!savedDocName) {
                        navigate(`/universal-registration/${message.docname}`, { replace: true });
                    }
                } else {
                    throw new Error(message.message || "Failed to save data. No success status received.");
                }
            } else {
                throw new Error("Invalid response received from the server.");
            }
        } catch (error: any) {
            console.error("Error saving form:", error);
            const errorMsg = error.exc ? JSON.parse(error.exc)[0] : error.message || "An unexpected error occurred while saving.";
            alert(`Error Saving Form: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const isReadOnly = formData.docstatus === 1 || formData.docstatus === 2; // Submitted or Cancelled

    if (isLoadingFields) {
        return (
            <div className="flex-1 w-full bg-[#FAFAF9] min-h-screen">
                <div className="max-w-[1240px] px-8 py-10 mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                        </div>
                    </div>
                    <Card className="border-zinc-200 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-[#FDFDFD]">
                            <Skeleton className="h-6 w-[200px] mb-2" />
                            <Skeleton className="h-4 w-[350px]" />
                        </CardHeader>
                        <CardContent className="p-8 space-y-8 bg-white">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="space-y-4">
                                    <Skeleton className="h-5 w-[150px]" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <Skeleton className="h-10 w-full rounded-lg" />
                                        <Skeleton className="h-10 w-full rounded-lg" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full bg-[#FAFAF9] min-h-screen">
            <div className="max-w-[1240px] px-8 py-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">

                {/* --- Header Section (Claude UI) --- */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 mt-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900 mt-1 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight leading-none mb-2 flex items-center gap-3">
                                Universal Registration
                                {formData.status_u_r && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                                        {formData.status_u_r}
                                    </span>
                                )}
                            </h1>
                            <p className="text-sm font-sans text-zinc-500 max-w-2xl">
                                {savedDocName
                                    ? `Editing universal registration document ${savedDocName}`
                                    : "Create a new universal registration profile."}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-start">
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm transition-all text-sm font-medium"
                        >
                            Cancel
                        </Button>
                        {!isReadOnly && (
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-[#D97757] text-white hover:bg-[#C2654A] shadow-sm transition-all min-w-[100px] text-sm font-medium"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Registration
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {/* --- Main Application Form Card --- */}
                <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white">
                    <CardHeader className="bg-[#FDFDFD] border-b border-zinc-100 px-8 py-6">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-zinc-400" />
                            <CardTitle className="text-sm font-medium text-zinc-500 uppercase tracking-wider font-sans">
                                Registration Details
                            </CardTitle>
                        </div>
                        <CardDescription className="text-base text-zinc-700 font-medium font-serif">
                            Please fill out the form fields below. All mandatory fields are marked with a red asterisk.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="p-8">
                            <DynamicFormRenderer
                                fields={filteredFields}
                                formData={formData}
                                onChange={handleFieldChange}
                                linkOptions={linkOptions}
                                readOnly={isReadOnly}
                                onFileChange={handleFileChange}
                                onTableRowChange={handleTableRowChange}
                                onTableFileChange={handleTableFileChange}
                                onAddTableRow={handleAddTableRow}
                                onDeleteTableRow={handleDeleteTableRow}
                            />
                        </div>

                        {/* Sticky Action Footer */}
                        {!isReadOnly && (
                            <div className="sticky bottom-0 border-t border-zinc-200 bg-[#FDFDFD]/95 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10 transition-all shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.1)]">
                                <div className="text-sm text-zinc-500 font-medium">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-[#D97757]" />
                                        Registration in Draft Mode
                                    </span>
                                </div>
                                <div className="space-x-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate(-1)}
                                        className="bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium transition-colors"
                                    >
                                        Discard Changes
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-[#D97757] text-white hover:bg-[#C2654A] font-medium shadow-sm transition-all min-w-[120px]"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Information
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
