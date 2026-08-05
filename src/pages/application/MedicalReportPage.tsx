import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { selectionCommitteeReportAPI, selectionCandidateDetailsAPI } from '@/services/apiService';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';

// ─── Styles (shared with AppointmentOrderPage print rules) ────────────────────
const styles = `
.ao-input {
    border: none;
    border-bottom: 1px dashed #ef4444;
    outline: none;
    background: #fee2e2;
    padding: 2px 4px;
    font-family: inherit;
    font-size: inherit;
    color: #991b1b;
    min-width: 60px;
    border-radius: 2px;
}
.ao-input::placeholder { color: #f87171; opacity: 1; }
.ao-input:focus { border-bottom: 1px solid #dc2626; background: #fecdd3; color: #7f1d1d; }
textarea.ao-input { display: block; width: 100%; resize: none; }

@media print {
    @page { size: A4; margin: 0; }

    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        --sidebar-width: 0px !important;
        --sidebar-width-mobile: 0px !important;
        --sidebar-width-icon: 0px !important;
    }

    .ao-toolbar { display: none !important; }

    .ao-input {
        border: none !important;
        background: transparent !important;
        color: #000 !important;
        box-shadow: none !important;
        padding: 0 !important;
    }
    .ao-input::placeholder { color: transparent !important; }
    textarea.ao-input { resize: none !important; }

    .no-print, header, aside, .sidebar,
    [data-sidebar="sidebar"], [data-sidebar], nav, button {
        display: none !important;
    }

    html, body, #root, .App, main,
    [data-sidebar-inset], .SidebarProvider,
    [data-sidebar="inset"], [data-sidebar="wrapper"] {
        background: white !important;
        background-color: white !important;
        margin: 0 !important; padding: 0 !important;
        border: 0 !important; width: 100% !important;
        max-width: 100% !important; height: auto !important;
        overflow: visible !important; min-height: 0 !important;
        display: block !important; inset: 0 !important;
        transform: none !important; box-sizing: border-box !important;
        position: static !important;
    }

    body > div, #root > div, #root > div > div {
        margin: 0 !important; padding: 0 !important;
        display: block !important; width: 100% !important;
        max-width: 100% !important; background: white !important;
    }

    .ao-page-wrapper {
        background: white !important;
        padding: 0 !important;
    }

    .ao-document {
        box-shadow: none !important;
        width: 100% !important;
        min-height: 0 !important;
        overflow: visible !important;
    }
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────
type Candidate = {
    candidate_name: string;
    candidate_surname: string;
    application_id: string;
    recruitment_post_id: string;
    candidate_id: string;
    applied_post: string;
};

// ─── Component ────────────────────────────────────────────────────────────────
const MedicalReportPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);

    const scrName = searchParams.get('scr') || '';
    const applicationId = searchParams.get('application_id') || '';

    // Fetched
    const [loading, setLoading] = useState(true);
    const [projectNumber, setProjectNumber] = useState('');
    const [projectName, setProjectName] = useState('');
    const [recruitmentType, setRecruitmentType] = useState('');
    const [piName, setPiName] = useState('');
    const [piDept, setPiDept] = useState('');
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [salutation, setSalutation] = useState('Mr.');

    // Editable
    const [issueNumber, setIssueNumber] = useState('');

    const [scdDocName, setScdDocName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const { call: fetchSCRFields } = useFrappePostCall(selectionCommitteeReportAPI.getFields);
    const { call: fetchCandidateByApplication } = useFrappePostCall(selectionCandidateDetailsAPI.getByApplication);
    const { call: updateMedicalReportNumber } = useFrappePostCall(selectionCandidateDetailsAPI.updateMedicalReportNumber);
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>('frappe.client.get_value');

    useEffect(() => {
        if (!scrName && !applicationId) { setLoading(false); return; }
        (async () => {
            setLoading(true);
            try {
                const [scrRes, scdRes] = await Promise.all([
                    scrName ? fetchSCRFields({ doc_name: scrName }) : Promise.resolve(null),
                    applicationId ? fetchCandidateByApplication({ application_id: applicationId }) : Promise.resolve(null),
                ]);

                // ── SCR: project / PI data ──
                const prefill = scrRes?.message?.prefill_data;
                if (prefill) {
                    setProjectNumber(prefill.project_number || '');
                    setProjectName(prefill.project_name || '');
                    setRecruitmentType(prefill.recruitment_type || '');

                    const candidates: Candidate[] =
                        typeof prefill.candidates === 'string'
                            ? JSON.parse(prefill.candidates)
                            : (prefill.candidates || []);

                    const found = candidates.find(c =>
                        String(c.application_id) === String(applicationId)
                    );
                    if (found) setCandidate(found);

                    const piLookup = prefill.principal_investigator
                        ? fetchFrappeValue({ doctype: 'User', filters: prefill.principal_investigator, fieldname: 'full_name' }).catch(() => null)
                        : Promise.resolve(null);
                    const deptLookup = prefill.upfa_department
                        ? fetchFrappeValue({ doctype: 'Department_prornd', filters: prefill.upfa_department, fieldname: 'dept_name' }).catch(() => null)
                        : Promise.resolve(null);
                    const [piRes, deptRes] = await Promise.all([piLookup, deptLookup]);
                    setPiName(piRes?.message?.full_name || prefill.principal_investigator || '');
                    setPiDept(deptRes?.message?.dept_name || prefill.upfa_department || '');
                }

                // ── SCD: candidate contact info ──
                const scdDocs = scdRes?.message?.data;
                if (Array.isArray(scdDocs) && scdDocs.length > 0) {
                    const scd = scdDocs[0];
                    if (scd.name) setScdDocName(scd.name);
                    setCandidate(prev => prev ? { ...prev, candidate_name: scd.candidate_name || prev.candidate_name, candidate_surname: scd.candidate_surname || '' } : prev);
                    if (scd.recruitment_type) setRecruitmentType(scd.recruitment_type);
                    if (scd.gender) setSalutation(String(scd.gender).toLowerCase() === 'female' ? 'Ms.' : 'Mr.');
                    if (scd.medical_report_number) {
                        const projNum = scrRes?.message?.prefill_data?.project_number || '';
                        const raw = String(scd.medical_report_number);
                        const stripped = projNum && raw.startsWith(`${projNum}/`)
                            ? raw.slice(projNum.length + 1)
                            : raw.includes('/') ? raw.split('/').slice(1).join('/') : raw;
                        setIssueNumber(stripped);
                    }
                }
            } catch (e) {
                console.error('MedicalReport load error:', e);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrName, applicationId]);

    const fullName = candidate
        ? [candidate.candidate_name, candidate.candidate_surname].filter(Boolean).join(' ')
        : '';
    const today = (() => {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}-${mm}-${d.getFullYear()}`;
    })();
    const appliedPost = candidate?.applied_post || '';
    const projectType = recruitmentType || '';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans">
                <div className="flex items-center gap-3 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] px-5 py-4 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-[#D97757]" />
                    <span className="text-sm font-semibold text-[#71717A] dark:text-[#A1A1AA]">Loading medical report</span>
                </div>
            </div>
        );
    }

    if (!candidate) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-[#FAFAF9] dark:bg-[#18181B] font-sans text-zinc-500">
                <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-8 text-center shadow-sm">
                    <p className="text-sm font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">Could not load candidate data.</p>
                    <button onClick={() => navigate(-1)} className="mt-3 text-xs font-bold uppercase tracking-wide text-[#D97757]">Go Back</button>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!issueNumber) return;
        if (!scdDocName) { setSaveStatus('error'); return; }
        setSaving(true);
        setSaveStatus('idle');
        try {
            const res = await updateMedicalReportNumber({
                docname: scdDocName,
                medical_report_number: `${projectNumber}/${issueNumber}`,
            });
            setSaveStatus(res?.message?.status === 'success' ? 'success' : 'error');
        } catch {
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    const Letterhead = () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <img
                src="http://172.16.131.206:8000/files/IITG_logo.png"
                alt="IITG"
                style={{ width: '55px', height: 'auto', flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div style={{ lineHeight: '1.35' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Indian Institute of Technology Guwahati</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans">
            <style>{styles}</style>

            {/* Toolbar */}
            <div className="ao-toolbar sticky top-0 z-20 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-white/95 dark:bg-[#27272A]/95 shadow-sm backdrop-blur">
                <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3 md:px-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-3 text-sm font-semibold text-[#71717A] transition-colors hover:border-[#D97757]/40 hover:bg-[#D97757]/10 hover:text-[#D97757]"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>
                    <div className="min-w-0 text-center">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Medical Report Generation</p>
                        <p className="truncate text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{fullName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !issueNumber}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-4 text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7] shadow-sm transition-colors hover:border-[#D97757]/40 hover:bg-[#D97757]/10 hover:text-[#D97757] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            {saving ? 'Saving…' : saveStatus === 'success' ? 'Saved ✓' : saveStatus === 'error' ? 'Error ✗' : 'Save Medical Order Number'}
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#D97757] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#c66a4e]"
                        >
                            <Printer size={15} />
                            Print
                        </button>
                    </div>
                </div>
            </div>

            {/* A4 scroll area */}
            <div className="ao-page-wrapper px-4 py-8 md:px-8">
                <div
                    ref={printRef}
                    className="ao-document"
                    style={{
                        backgroundColor: 'white',
                        boxShadow: '0 18px 48px rgba(24,24,27,0.14)',
                        width: '210mm',
                        minHeight: '297mm',
                        fontFamily: '"Times New Roman", Times, serif',
                        fontSize: '12px',
                        lineHeight: '1.55',
                        color: '#000',
                        padding: '12mm 15mm 14mm',
                        margin: '0 auto',
                    }}
                >
                    {/* ══ LETTER 1 : Request for Medical Examination ══ */}
                    <Letterhead />
                    <div style={{ marginTop: '4px', lineHeight: '1.35' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginLeft: '83px' }}>अनुसंधान एवं विकास प्रकोष्ठ</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginLeft: '83px' }}>Research and Development Cell</div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '22px' }}>
                        <tbody>
                            <tr>
                                <td style={{ verticalAlign: 'top' }}>
                                    <div>श्री दिपोन लाल बैश्य</div>
                                    <div style={{ fontWeight: 'bold' }}>Mr. Dipon Lal Baishya</div>
                                    <div style={{ marginTop: '8px' }}>अनुभाग प्रमुख(अनुसंधान एवं विकास प्रकोष्ठ))</div>
                                    <div style={{ fontWeight: 'bold' }}>HoS, Research and Development Cell(R&amp;D)</div>
                                </td>
                                <td style={{ verticalAlign: 'top', textAlign: 'right', fontSize: '11.5px' }}>
                                    <div>Guwahati-781039</div>
                                    <div>Phone : +91-361-2583089</div>
                                    <div>Email Id: rndadmin@iitg.ac.in</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Ref & Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '14px' }}>
                        <span>
                            <strong style={{ color: '#b00' }}>Ref:</strong> {projectNumber}/
                            <input
                                type="text"
                                value={issueNumber}
                                onChange={e => setIssueNumber(e.target.value)}
                                placeholder="Issue Num"
                                maxLength={140}
                                className="ao-input"
                                style={{ width: '100px' }}
                            />
                            {issueNumber.length >= 140 && (
                                <span style={{ color: '#dc2626', fontSize: '10px', fontWeight: 700, marginLeft: '4px' }}>
                                    (limit 140 reached)
                                </span>
                            )}
                        </span>
                        <span><strong style={{ color: '#b00' }}>Date:</strong> {today}</span>
                    </div>

                    {/* To block */}
                    <div style={{ marginTop: '18px' }}>
                        <div><strong>To,</strong></div>
                        <div style={{ marginTop: '12px' }}>The Chief Medical Officer (NFSG) &amp;</div>
                        <div>HoS, Medical section</div>
                        <div>IIT Guwahati</div>
                    </div>

                    {/* Subject */}
                    <div style={{ marginTop: '16px' }}>
                        <strong>Sub.:</strong>{' '}
                        <strong>Candidate selected for appointment as {appliedPost}</strong>
                        <div style={{ marginLeft: '2.6em' }}><strong>- Request for Medical Examination.</strong></div>
                    </div>

                    <div style={{ marginTop: '14px' }}>Sir,</div>

                    {/* Body */}
                    <p style={{ marginTop: '12px', textAlign: 'justify', lineHeight: '1.7' }}>
                        <strong>{salutation} {fullName}</strong> has been selected for appointment as{' '}
                        <strong>{appliedPost}</strong> in the {projectType} Project{' '}
                        "<strong>{projectName}</strong>" under <strong>{piName}</strong>, Dept. of {piDept},
                        IIT GUWAHATI. He/She may kindly be medically examined and a report on his/her fitness
                        be sent to the undersigned.
                    </p>

                    <div style={{ marginTop: '36px', textAlign: 'right' }}>Yours sincerely,</div>

                    {/* ══ LETTER 2 : Medical Certificate (starts on a new page when printing) ══ */}
                    <div style={{ paddingTop: '12mm', breakBefore: 'page', pageBreakBefore: 'always' }}>
                        <Letterhead />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '40px' }}>
                        <span>
                            <strong style={{ color: '#b00' }}>Ref:</strong> {projectNumber}
                            {issueNumber ? `/${issueNumber}` : ''}
                        </span>
                        <span><strong style={{ color: '#b00' }}>Date:</strong> {today}</span>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '28px', fontWeight: 'bold', fontSize: '13px' }}>
                        MEDICAL CERTIFICATE / चिकित्सा प्रमाणपत्र
                    </div>

                    <p style={{ marginTop: '22px', textAlign: 'justify', lineHeight: '1.8', textIndent: '2em' }}>
                        I hereby certify that I have this day examined <strong>{salutation} {fullName}</strong>{' '}
                        selected as an <strong>{appliedPost}</strong> in the {projectType} Project entitled{' '}
                        "<strong>{projectName}</strong>" under Principal Investigator Dr. <strong>{piName}</strong>,
                        Dept. of {piDept}, IIT GUWAHATI cannot discover that he/she has any disease, communicable
                        or otherwise, constitutional weakness or bodily infirmity, except __________________.
                    </p>

                    <p style={{ marginTop: '14px' }}>His/Her Blood Group is _____________</p>

                    <p style={{ marginTop: '14px' }}>
                        I <strong>do/donot</strong> consider this a disqualification for employment in the
                        Indian Institute of Technology Guwahati.
                    </p>

                    <p style={{ marginTop: '14px' }}>
                        <strong>{salutation} {fullName}</strong> age according to his/her own statement is
                        _________ years and by appearance about _________ years.
                    </p>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '60px' }}>
                        <tbody>
                            <tr>
                                <td style={{ verticalAlign: 'top' }}>Signature of the candidate</td>
                                <td style={{ verticalAlign: 'top', textAlign: 'right' }}>Signature of the</td>
                            </tr>
                            <tr>
                                <td style={{ verticalAlign: 'top', paddingTop: '40px' }}>Selected for employment</td>
                                <td style={{ verticalAlign: 'top', textAlign: 'right', paddingTop: '40px' }}>HoS,Medical section</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ marginTop: '44px' }}>
                        <strong>Copy to:</strong>
                        <p style={{ margin: '8px 0 0 2em', textIndent: '0' }}>
                            <strong>{salutation} {fullName}</strong> is directed to contact the Medical Officer
                            in charge, IIT Guwahati for necessary medical examination.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicalReportPage;
