import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth, useFrappeGetDocList, useFrappePostCall } from 'frappe-react-sdk';
import {
    IdCard, Search, Eye, CheckCircle2, Printer, ChevronRight,
    ArrowLeft, Loader2, X, User as UserIcon, Phone, MapPin,
    Briefcase, Calendar, Droplets, Heart, AlertCircle, FileText,
    Edit, RotateCcw, Save, Undo2, Upload, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppSidebar } from '@/components/RndSidebar';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { employeeIdCardAPI, fileToBase64 } from '@/services/apiService';
import { ErrorModal } from '@/components/ErrorModal';
import { parseFrappeError } from '@/utils/errorUtils';
import IDCardPrintTemplate from '../printformat/IDCardPrintTemplate';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { createZipArchive, type ZipFileEntry } from '@/utils/zipUtils';

interface IDCardRecord {
    name: string;
    emp_id__: string;
    project_number__: string;
    full_name__: string;
    dob__: string;
    blood_group__: string;
    phone__: string;
    emergency_phone__: string;
    marital_status__: string;
    spouse_name__: string;
    designation__: string;
    department_name__: string;
    valid_upto__: string;
    issue_date__: string;
    present_address__: string;
    permanent_address__: string;
    photo_path__: string;
    sign_path__: string;
    workflow_state: string;
    creation: string;
    modified: string;
    owner: string;
    remarks?: string;
    hr_comments?: string;
}

const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('draft') || s.includes('return')) return 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300';
    if (s.includes('submitted') || s.includes('pending')) return 'bg-[#D97757]/10 text-[#D97757] dark:bg-[#D97757]/20 border-[#D97757]/30 font-bold';
    if (s.includes('verified') || s.includes('approved')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200';
    if (s.includes('generated') || s.includes('completed')) return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200';
    if (s.includes('rejected')) return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200';
    return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200';
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];

const isSubmittedState = (status?: string) => {
    const s = status?.toLowerCase() || '';
    return s.includes('submit') || s.includes('pending');
};

const isVerifiedOrGeneratedState = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s.includes('verified') || s.includes('generated');
};

const HRIDCardManagement: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [selectedCard, setSelectedCard] = useState<IDCardRecord | null>(null);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [isActioning, setIsActioning] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({
        open: false, title: "Error", message: ""
    });
    const printRef = useRef<HTMLDivElement>(null);

    // HR Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<IDCardRecord>>({});
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [signFile, setSignFile] = useState<File | null>(null);
    const [photoEditPreview, setPhotoEditPreview] = useState<string | null>(null);
    const [signEditPreview, setSignEditPreview] = useState<string | null>(null);

    // Put Back Modal state
    const [showPutBackModal, setShowPutBackModal] = useState(false);
    const [putBackComment, setPutBackComment] = useState('');

    // Fetch all ID Card requests (excluding Draft/returned requests)
    const { data: cardList, isLoading, error: fetchError, mutate: refreshList } = useFrappeGetDocList<IDCardRecord>(
        'Employee ID Card',
        {
            fields: ['*'],
            orderBy: { field: 'modified', order: 'desc' },
            limit: 500,
        }
    );

    const { call: performAction, error: actionError } = useFrappePostCall(employeeIdCardAPI.performAction);
    const { call: saveForm, error: saveError } = useFrappePostCall(employeeIdCardAPI.save);

    // Filtered list (excludes Draft/returned documents)
    const filteredCards = useMemo(() => {
        if (!cardList || !Array.isArray(cardList)) return [];
        const term = searchTerm.trim().toLowerCase();

        return cardList.filter(card => {
            const cStatus = (card.workflow_state || '').trim();
            if (!cStatus || cStatus === 'Draft') return false;

            const matchesSearch = !term ||
                (card.full_name__ || '').toLowerCase().includes(term) ||
                (card.emp_id__ || '').toLowerCase().includes(term) ||
                (card.name || '').toLowerCase().includes(term) ||
                (card.department_name__ || '').toLowerCase().includes(term) ||
                (card.project_number__ || '').toLowerCase().includes(term);

            let matchesStatus = false;
            if (statusFilter === 'All') {
                matchesStatus = true;
            } else if (statusFilter === 'Submitted') {
                matchesStatus = isSubmittedState(cStatus);
            } else {
                matchesStatus = cStatus.toLowerCase().includes(statusFilter.toLowerCase());
            }

            return matchesSearch && matchesStatus;
        });
    }, [cardList, searchTerm, statusFilter]);

    // Status counts (excludes Draft/returned documents)
    const statusCounts = useMemo(() => {
        if (!cardList) return { total: 0, submitted: 0, verified: 0, generated: 0 };
        const nonDrafts = cardList.filter(c => c.workflow_state && c.workflow_state !== 'Draft');
        return {
            total: nonDrafts.length,
            submitted: nonDrafts.filter(c => isSubmittedState(c.workflow_state)).length,
            verified: nonDrafts.filter(c => c.workflow_state?.toLowerCase().includes('verified')).length,
            generated: nonDrafts.filter(c => c.workflow_state?.toLowerCase().includes('generated')).length,
        };
    }, [cardList]);

    // Start editing form in modal
    const handleStartEdit = useCallback(() => {
        if (!selectedCard) return;
        setEditForm({ ...selectedCard });
        setPhotoFile(null);
        setSignFile(null);
        setPhotoEditPreview(selectedCard.photo_path__ || null);
        setSignEditPreview(selectedCard.sign_path__ || null);
        setIsEditing(true);
    }, [selectedCard]);

    // Save HR edits
    const handleSaveEdit = useCallback(async () => {
        if (!selectedCard || !editForm) return;
        setIsActioning(true);
        try {
            const dataToSave: Record<string, any> = { ...editForm, name: selectedCard.name };

            if (photoFile) {
                dataToSave.photo_path__ = await fileToBase64(photoFile);
            }
            if (signFile) {
                dataToSave.sign_path__ = await fileToBase64(signFile);
            }

            const res = await saveForm({ data: JSON.stringify(dataToSave) });
            if (res?.message?.status === 'success' || res?.message?.name || res?.message?.docname) {
                alert('ID Card details updated successfully by HR!');
                refreshList();
                setSelectedCard(prev => prev ? { ...prev, ...editForm, ...dataToSave } : null);
                setIsEditing(false);
            } else {
                throw new Error(res?.message?.message || 'Save failed');
            }
        } catch (err: any) {
            setErrorModal({
                open: true,
                title: "Save Failed",
                message: parseFrappeError(saveError, err),
            });
        } finally {
            setIsActioning(false);
        }
    }, [selectedCard, editForm, photoFile, signFile, saveForm, saveError, refreshList]);

    // Handle Verify action
    const handleVerify = useCallback(async (docname: string) => {
        if (isActioning) return;
        if (!confirm('Are you sure you want to verify this ID card request?')) return;
        setIsActioning(true);
        try {
            const res = await performAction({ docname, action: 'Verify' });
            if (res?.message?.status === 'success') {
                alert('ID Card request verified successfully!');
                refreshList();
                setSelectedCard(null);
            } else {
                throw new Error(res?.message?.message || 'Verification failed');
            }
        } catch (err: any) {
            setErrorModal({
                open: true,
                title: "Verification Failed",
                message: parseFrappeError(actionError, err),
            });
        } finally {
            setIsActioning(false);
        }
    }, [isActioning, performAction, actionError, refreshList]);

    // Put Back / Return to user with comment
    const handleConfirmPutBack = useCallback(async () => {
        if (!selectedCard || !putBackComment.trim()) return;
        setIsActioning(true);
        try {
            const commentText = putBackComment.trim();

            const res = await performAction({
                docname: selectedCard.name,
                action: 'Return',
                comment: commentText,
            });

            if (res?.message?.status === 'success') {
                alert('Request put back to user with your comment.');
                refreshList();
                setShowPutBackModal(false);
                setSelectedCard(null);
                setPutBackComment('');
            } else {
                throw new Error(res?.message?.message || 'Put back action failed');
            }
        } catch (err: any) {
            setErrorModal({
                open: true,
                title: "Put Back Failed",
                message: parseFrappeError(actionError, err),
            });
        } finally {
            setIsActioning(false);
        }
    }, [selectedCard, putBackComment, performAction, actionError, refreshList]);

    // Handle Generate & Print
    const handleGenerateAndPrint = useCallback(async (card: IDCardRecord) => {
        setSelectedCard(card);
        setShowPrintPreview(true);
    }, []);

    // Close Print Preview and clear selected card
    const handleClosePrintPreview = useCallback(() => {
        setShowPrintPreview(false);
        setSelectedCard(null);
    }, []);

    // Helper to format folder name: {user_name}_{date}_{PDF|Image}
    const getFolderNameAndDate = useCallback((card: IDCardRecord | null, typeSuffix?: 'PDF' | 'Image') => {
        const rawName = card?.full_name__ || card?.emp_id__ || 'ID_Card';
        const cleanName = rawName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const dateStr = `${day}-${month}-${year}`;

        const folderName = typeSuffix ? `${cleanName}_${dateStr}_${typeSuffix}` : `${cleanName}_${dateStr}`;

        return {
            cleanName,
            dateStr,
            folderName
        };
    }, []);

    // Save files inside folder {user_name}_{date}_{type} (via File System Access API or ZIP archive fallback)
    const saveFilesToFolder = useCallback(async (folderName: string, files: { name: string; blob: Blob }[]) => {
        if ('showDirectoryPicker' in window) {
            try {
                const rootDir = await (window as any).showDirectoryPicker({
                    mode: 'readwrite',
                });
                const subDir = await rootDir.getDirectoryHandle(folderName, { create: true });

                for (const file of files) {
                    const fileHandle = await subDir.getFileHandle(file.name, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file.blob);
                    await writable.close();
                }
                return true;
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    return false;
                }
                console.warn('showDirectoryPicker failed or declined, falling back to ZIP folder download:', err);
            }
        }

        // Package files inside a folder in ZIP archive
        const zipEntries: ZipFileEntry[] = [];
        for (const file of files) {
            const arrayBuffer = await file.blob.arrayBuffer();
            zipEntries.push({
                path: `${folderName}/${file.name}`,
                data: new Uint8Array(arrayBuffer),
            });
        }

        const zipBlob = createZipArchive(zipEntries);
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${folderName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    }, []);

    // Mark ID Card status as Generated in Frappe
    const markAsGenerated = useCallback(async () => {
        if (selectedCard && selectedCard.workflow_state !== 'Generated') {
            try {
                await performAction({ docname: selectedCard.name, action: 'Generate ID Card' });
                refreshList();
                setSelectedCard(prev => prev ? { ...prev, workflow_state: 'Generated' } : null);
            } catch (e) {
                console.error('Failed to set status to Generated:', e);
            }
        }
    }, [selectedCard, performAction, refreshList]);

    // Download High-Res PNG Images (Front & Back) in folder
    const handleDownloadPNG = useCallback(async () => {
        if (!printRef.current) return;
        setIsActioning(true);
        try {
            const frontEl = printRef.current.querySelector('#id-card-front') as HTMLElement;
            const backEl = printRef.current.querySelector('#id-card-back') as HTMLElement;

            const options = {
                pixelRatio: 4,
                cacheBust: true,
                backgroundColor: '#ffffff',
            };

            const { folderName } = getFolderNameAndDate(selectedCard, 'Image');
            const files: { name: string; blob: Blob }[] = [];

            if (frontEl) {
                const imgFrontUrl = await toPng(frontEl, options);
                const res = await fetch(imgFrontUrl);
                const blob = await res.blob();
                files.push({ name: `ID_Card_Front_${folderName}.png`, blob });
            }

            if (backEl) {
                const imgBackUrl = await toPng(backEl, options);
                const res = await fetch(imgBackUrl);
                const blob = await res.blob();
                files.push({ name: `ID_Card_Back_${folderName}.png`, blob });
            }

            await saveFilesToFolder(folderName, files);
            await markAsGenerated();
        } catch (err) {
            console.error('PNG download error:', err);
            setErrorModal({
                open: true,
                title: "Download Failed",
                message: "Could not generate High-Res PNG images.",
            });
        } finally {
            setIsActioning(false);
        }
    }, [selectedCard, getFolderNameAndDate, saveFilesToFolder, markAsGenerated]);

    // Download ID Card as PDF in folder
    const handlePrint = useCallback(async () => {
        if (!printRef.current) return;
        setIsActioning(true);
        try {
            const frontEl = printRef.current.querySelector('#id-card-front') as HTMLElement;
            const backEl = printRef.current.querySelector('#id-card-back') as HTMLElement;

            const options = {
                pixelRatio: 4,
                cacheBust: true,
                backgroundColor: '#ffffff',
            };

            // CR80 card: 85.6mm x 53.98mm
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [85.6, 53.98],
            });

            if (frontEl && backEl) {
                const imgFront = await toPng(frontEl, options);
                pdf.addImage(imgFront, 'PNG', 0, 0, 85.6, 53.98, undefined, 'FAST');

                pdf.addPage([85.6, 53.98], 'landscape');

                const imgBack = await toPng(backEl, options);
                pdf.addImage(imgBack, 'PNG', 0, 0, 85.6, 53.98, undefined, 'FAST');
            } else {
                const imgData = await toPng(printRef.current, options);
                pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98, undefined, 'FAST');
            }

            const { folderName } = getFolderNameAndDate(selectedCard, 'PDF');
            const pdfBlob = pdf.output('blob');

            await saveFilesToFolder(folderName, [
                { name: `ID_Card_${folderName}.pdf`, blob: pdfBlob }
            ]);

            await markAsGenerated();
        } catch (err) {
            console.error('Print error:', err);
            setErrorModal({
                open: true,
                title: "Print Failed",
                message: "Could not generate the ID card PDF. Please try again.",
            });
        } finally {
            setIsActioning(false);
        }
    }, [selectedCard, getFolderNameAndDate, saveFilesToFolder, markAsGenerated]);

    // Use browser print directly for better quality
    const handleBrowserPrint = useCallback(() => {
        if (!printRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the ID card.');
            return;
        }

        const content = printRef.current.innerHTML;
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>ID Card — ${selectedCard?.full_name__ || ''}</title>
                <style>
                    @page { size: 85.6mm 53.98mm; margin: 0; }
                    body { margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #ffffff; }
                    .card-side { page-break-after: always; break-after: page; width: 85.6mm; height: 53.98mm; box-sizing: border-box; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
            markAsGenerated();
        };
    }, [selectedCard, markAsGenerated]);

    // Loading
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4A6CF7] border-t-transparent mx-auto" />
                    <p className="mt-4 text-sm font-medium text-zinc-500">Loading ID card requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader title="ID Card Management" />

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Total Requests', value: statusCounts.total, color: 'text-[#4A6CF7]', bg: 'bg-[#4A6CF7]/10' },
                        { label: 'Pending Review', value: statusCounts.submitted, color: 'text-[#D97757]', bg: 'bg-[#D97757]/10 dark:bg-[#D97757]/20' },
                        { label: 'Verified', value: statusCounts.verified, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                        { label: 'ID Generated', value: statusCounts.generated, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-4">
                            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                            <p className={cn("text-2xl font-bold mt-1", stat.color)}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by name, ID, department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 min-w-[160px]"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Submitted">Submitted</option>
                        <option value="HR Verified">HR Verified</option>
                        <option value="ID Generated">ID Generated</option>
                    </select>
                </div>

                {/* Request List */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
                    {filteredCards.length === 0 ? (
                        <div className="py-16 text-center">
                            <IdCard className="h-10 w-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No ID card requests found</p>
                            <p className="text-xs text-zinc-400 mt-1">Requests submitted by project staff will appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                            {filteredCards.map((card) => (
                                <div
                                    key={card.name}
                                    className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-[#4A6CF7]/10 dark:bg-[#4A6CF7]/20 flex items-center justify-center flex-shrink-0">
                                                {card.photo_path__ ? (
                                                    <img src={card.photo_path__} alt="" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <UserIcon className="h-5 w-5 text-[#4A6CF7]" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-semibold text-[#27272A] dark:text-[#E4E4E7] truncate">
                                                        {card.full_name__}
                                                    </p>
                                                    <Badge className={cn("text-[10px] font-bold px-2 py-0.5 border", getStatusStyle(card.workflow_state))}>
                                                        {card.workflow_state}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    <span className="font-medium">{card.emp_id__}</span>
                                                    {' · '}
                                                    {card.designation__}
                                                    {' · '}
                                                    {card.department_name__}
                                                </p>
                                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                                    {card.name} · Modified {formatDate(card.modified)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* View Details */}
                                            <button
                                                onClick={() => { setSelectedCard(card); setIsEditing(false); }}
                                                className="px-3 py-1.5 text-xs font-semibold text-[#4A6CF7] hover:text-white hover:bg-[#4A6CF7] border border-[#4A6CF7]/20 hover:border-[#4A6CF7] rounded-lg transition-all flex items-center gap-1"
                                            >
                                                <Eye className="h-3.5 w-3.5" /> View
                                            </button>

                                            {/* Put Back to User */}
                                            {card.workflow_state !== 'Draft' && (
                                                <button
                                                    onClick={() => { setSelectedCard(card); setPutBackComment(''); setShowPutBackModal(true); }}
                                                    className="px-3 py-1.5 text-xs font-semibold text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-200 hover:border-amber-600 rounded-lg transition-all flex items-center gap-1"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" /> Put Back
                                                </button>
                                            )}

                                            {/* Verify (only for Submitted state) */}
                                            {card.workflow_state === 'Submitted' && (
                                                <button
                                                    onClick={() => handleVerify(card.name)}
                                                    disabled={isActioning}
                                                    className="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200 hover:border-emerald-600 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                                                </button>
                                            )}

                                            {/* Generate & Print (only for Verified or Generated states) */}
                                            {isVerifiedOrGeneratedState(card.workflow_state) && (
                                                <button
                                                    onClick={() => handleGenerateAndPrint(card)}
                                                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-lg transition-all flex items-center gap-1"
                                                >
                                                    <Printer className="h-3.5 w-3.5" /> Print ID
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Detail / Edit Modal */}
            {selectedCard && !showPrintPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#4A6CF7]/10 rounded-lg">
                                    <IdCard className="h-5 w-5 text-[#4A6CF7]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#27272A] dark:text-[#E4E4E7]">
                                        {isEditing ? "Edit ID Card Request" : "ID Card Details"}
                                    </h3>
                                    <p className="text-xs text-zinc-500">{selectedCard.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isEditing ? (
                                    <button
                                        onClick={handleStartEdit}
                                        className="px-3 py-1.5 text-xs font-semibold text-[#4A6CF7] hover:bg-[#4A6CF7]/10 border border-[#4A6CF7]/30 rounded-lg transition-all flex items-center gap-1"
                                    >
                                        <Edit className="h-3.5 w-3.5" /> Edit Form
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                                        >
                                            Cancel Edit
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={isActioning}
                                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4A6CF7] hover:bg-[#3b5cf6] rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                            Save Changes
                                        </button>
                                    </div>
                                )}
                                <button onClick={() => { setSelectedCard(null); setIsEditing(false); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                    <X className="h-5 w-5 text-zinc-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-zinc-500 uppercase">Status:</span>
                                    <Badge className={cn("text-xs font-bold px-2.5 py-1 border", getStatusStyle(selectedCard.workflow_state))}>
                                        {selectedCard.workflow_state}
                                    </Badge>
                                </div>
                            </div>

                            {/* HR Remarks Banner if present */}
                            {(selectedCard.remarks || selectedCard.hr_comments) && !isEditing && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                                        <MessageSquare className="h-3.5 w-3.5 text-amber-600" /> HR Remarks / Return Reason:
                                    </p>
                                    <p className="text-xs text-amber-800 dark:text-amber-400 mt-1 pl-4">
                                        {selectedCard.remarks || selectedCard.hr_comments}
                                    </p>
                                </div>
                            )}

                            {/* EDIT MODE FORM */}
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Employee ID *</label>
                                            <input
                                                type="text"
                                                value={editForm.emp_id__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, emp_id__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Full Name *</label>
                                            <input
                                                type="text"
                                                value={editForm.full_name__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, full_name__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Project Number *</label>
                                            <input
                                                type="text"
                                                value={editForm.project_number__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, project_number__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Designation *</label>
                                            <input
                                                type="text"
                                                value={editForm.designation__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, designation__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Department *</label>
                                            <input
                                                type="text"
                                                value={editForm.department_name__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, department_name__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Date of Birth *</label>
                                            <input
                                                type="date"
                                                value={editForm.dob__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, dob__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Blood Group *</label>
                                            <select
                                                value={editForm.blood_group__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, blood_group__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            >
                                                <option value="">Select Blood Group</option>
                                                {BLOOD_GROUPS.map(bg => (
                                                    <option key={bg} value={bg}>{bg}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Phone *</label>
                                            <input
                                                type="text"
                                                value={editForm.phone__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, phone__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Emergency Phone *</label>
                                            <input
                                                type="text"
                                                value={editForm.emergency_phone__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, emergency_phone__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Marital Status *</label>
                                            <select
                                                value={editForm.marital_status__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, marital_status__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            >
                                                <option value="">Select Status</option>
                                                {MARITAL_STATUSES.map(st => (
                                                    <option key={st} value={st}>{st}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {editForm.marital_status__ === 'Married' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Spouse Name *</label>
                                                <input
                                                    type="text"
                                                    value={editForm.spouse_name__ || ''}
                                                    onChange={e => setEditForm(prev => ({ ...prev, spouse_name__: e.target.value }))}
                                                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Issue Date *</label>
                                            <input
                                                type="date"
                                                value={editForm.issue_date__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, issue_date__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Valid Upto *</label>
                                            <input
                                                type="date"
                                                value={editForm.valid_upto__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, valid_upto__: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Present Address *</label>
                                            <textarea
                                                value={editForm.present_address__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, present_address__: e.target.value }))}
                                                rows={2}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Permanent Address *</label>
                                            <textarea
                                                value={editForm.permanent_address__ || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, permanent_address__: e.target.value }))}
                                                rows={2}
                                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                            />
                                        </div>
                                    </div>

                                    {/* Photo & Signature Upload */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Passport Photo</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        setPhotoFile(f);
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setPhotoEditPreview(reader.result as string);
                                                        reader.readAsDataURL(f);
                                                    }
                                                }}
                                                className="block w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#4A6CF7]/10 file:text-[#4A6CF7]"
                                            />
                                            {photoEditPreview && (
                                                <img src={photoEditPreview} alt="Preview" className="w-16 h-20 mt-2 object-cover rounded border border-zinc-200 dark:border-zinc-700" />
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Signature</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        setSignFile(f);
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setSignEditPreview(reader.result as string);
                                                        reader.readAsDataURL(f);
                                                    }
                                                }}
                                                className="block w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#4A6CF7]/10 file:text-[#4A6CF7]"
                                            />
                                            {signEditPreview && (
                                                <img src={signEditPreview} alt="Preview" className="h-12 mt-2 object-contain rounded border border-zinc-200 dark:border-zinc-700 bg-white p-1" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* VIEW MODE DETAILS */
                                <>
                                    {/* Photo & Signature Preview */}
                                    <div className="flex flex-wrap items-center justify-center gap-6">
                                        <div className="text-center">
                                            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                                Photo
                                            </p>
                                            <div className="w-24 h-28 rounded-lg overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                                                {selectedCard.photo_path__ ? (
                                                    <img
                                                        src={selectedCard.photo_path__}
                                                        alt="Staff Photo"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <UserIcon className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center">
                                            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                                Signature
                                            </p>
                                            <div className="w-36 h-20 rounded-lg overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1.5 flex items-center justify-center">
                                                {selectedCard.sign_path__ ? (
                                                    <img
                                                        src={selectedCard.sign_path__}
                                                        alt="Staff Signature"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-xs text-zinc-400 italic">No signature uploaded</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                        {[
                                            { label: 'Employee ID', value: selectedCard.emp_id__, icon: IdCard },
                                            { label: 'Full Name', value: selectedCard.full_name__, icon: UserIcon },
                                            { label: 'Project Number', value: selectedCard.project_number__, icon: FileText },
                                            { label: 'Date of Birth', value: formatDate(selectedCard.dob__), icon: Calendar },
                                            { label: 'Blood Group', value: selectedCard.blood_group__, icon: Droplets },
                                            { label: 'Phone', value: selectedCard.phone__, icon: Phone },
                                            { label: 'Emergency Phone', value: selectedCard.emergency_phone__, icon: Phone },
                                            { label: 'Marital Status', value: selectedCard.marital_status__, icon: Heart },
                                            ...(selectedCard.marital_status__ === 'Married' ? [{ label: 'Spouse Name', value: selectedCard.spouse_name__, icon: UserIcon }] : []),
                                            { label: 'Designation', value: selectedCard.designation__, icon: Briefcase },
                                            { label: 'Department', value: selectedCard.department_name__, icon: Briefcase },
                                            { label: 'Issue Date', value: formatDate(selectedCard.issue_date__), icon: Calendar },
                                            { label: 'Valid Upto', value: formatDate(selectedCard.valid_upto__), icon: Calendar },
                                        ].map((item, idx) => (
                                            <div key={idx}>
                                                <dt className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 text-xs font-medium">
                                                    <item.icon className="h-3.5 w-3.5" /> {item.label}
                                                </dt>
                                                <dd className="font-semibold text-[#27272A] dark:text-[#E4E4E7] mt-0.5">
                                                    {item.value || '—'}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>

                                    {/* Addresses */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5 mb-1">
                                                <MapPin className="h-3.5 w-3.5" /> Present Address
                                            </p>
                                            <p className="text-sm text-[#27272A] dark:text-[#E4E4E7] bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                                                {selectedCard.present_address__ || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5 mb-1">
                                                <MapPin className="h-3.5 w-3.5" /> Permanent Address
                                            </p>
                                            <p className="text-sm text-[#27272A] dark:text-[#E4E4E7] bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                                                {selectedCard.permanent_address__ || '—'}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Action Buttons Footer */}
                            <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-700">
                                <div>
                                    {/* Put Back to User button */}
                                    {!isEditing && selectedCard.workflow_state !== 'Draft' && (
                                        <button
                                            onClick={() => { setPutBackComment(''); setShowPutBackModal(true); }}
                                            className="px-3.5 py-2 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 rounded-lg transition-all flex items-center gap-1.5"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" /> Put Back to User
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={isActioning}
                                                className="px-4 py-2 text-sm font-semibold text-white bg-[#4A6CF7] hover:bg-[#3b5cf6] rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                Save Changes
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {selectedCard.workflow_state === 'Submitted' && (
                                                <button
                                                    onClick={() => handleVerify(selectedCard.name)}
                                                    disabled={isActioning}
                                                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                    Verify Request
                                                </button>
                                            )}
                                            {isVerifiedOrGeneratedState(selectedCard.workflow_state) && (
                                                <button
                                                    onClick={() => handleGenerateAndPrint(selectedCard)}
                                                    className="px-4 py-2 text-sm font-semibold text-white bg-[#4A6CF7] hover:bg-[#3b5cf6] rounded-lg transition-all flex items-center gap-2"
                                                >
                                                    <Printer className="h-4 w-4" /> Generate & Print ID Card
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Put Back to User Modal with Comment Box */}
            {showPutBackModal && selectedCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-[#4A6CF7]/10 dark:bg-[#4A6CF7]/20 rounded-lg">
                                <RotateCcw className="h-5 w-5 text-[#4A6CF7]" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#27272A] dark:text-[#E4E4E7]">Put Back Request to User</h3>
                                <p className="text-xs text-zinc-500">{selectedCard.full_name__} ({selectedCard.emp_id__})</p>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                            Please provide the reason or comments explaining why this request is being returned to the user. The user will be able to see your comments, edit their details, and resubmit.
                        </p>

                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                HR Comment / Reason *
                            </label>
                            <textarea
                                value={putBackComment}
                                onChange={(e) => setPutBackComment(e.target.value)}
                                placeholder="e.g. Please upload a clearer passport photo with white background and verify emergency contact number..."
                                rows={4}
                                className="w-full p-3 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowPutBackModal(false); setPutBackComment(''); setSelectedCard(null); }}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmPutBack}
                                disabled={isActioning || !putBackComment.trim()}
                                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                Confirm Put Back
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Preview Modal */}
            {showPrintPreview && selectedCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full">
                        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                            <h3 className="font-bold text-[#27272A] dark:text-[#E4E4E7]">ID Card Preview</h3>
                            <button onClick={handleClosePrintPreview} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                                <X className="h-5 w-5 text-zinc-500" />
                            </button>
                        </div>

                        <div className="p-6 flex justify-center">
                            <div ref={printRef}>
                                <IDCardPrintTemplate data={selectedCard} />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end gap-3 flex-wrap">
                            <button
                                onClick={handleClosePrintPreview}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleDownloadPNG}
                                disabled={isActioning}
                                className="px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                Download High-Res PNG
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={isActioning}
                                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                Download PDF
                            </button>
                            <button
                                onClick={handleBrowserPrint}
                                className="px-4 py-2 text-sm font-semibold text-white bg-[#4A6CF7] hover:bg-[#3b5cf6] rounded-lg transition-all flex items-center gap-2"
                            >
                                <Printer className="h-4 w-4" /> Print
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal(prev => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default HRIDCardManagement;
