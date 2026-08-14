import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { selectionCommitteeReportAPI, selectionCandidateDetailsAPI } from '@/services/apiService';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { FRAPPE_BASE_URL } from '@/config';

// Inline (non-block) limit warning — this page is a printable letter template
// laid out with inline spans/paragraphs, so the shared block-level
// CharLimitAlert would break the document flow.
const InlineCharLimitWarn = ({ value, maxLength }: { value: string; maxLength: number }) =>
    value.length >= maxLength ? (
        <span style={{ color: '#dc2626', fontSize: '10px', fontWeight: 700, marginLeft: '4px' }}>
            (limit {maxLength} reached)
        </span>
    ) : null;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
/* Editable input — red dashed underline on screen */
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
    @page { size: A4; margin: 12mm 15mm 14mm; }

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
        width: auto !important;
        max-width: none !important;
        min-height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
        box-sizing: border-box !important;
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
    basic_pay: number;
    hra: string;
    total_amount: number;
};

type PostDetail = {
    name: string;
    upfa_designation: string;
    upfa_duration_months: number;
};

const capitalizeName = (value: string) =>
    value
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');

// ─── Component ────────────────────────────────────────────────────────────────
const AppointmentOrderPage: React.FC = () => {
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
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [duration, setDuration] = useState(0);

    // Editable
    const [issueNumber, setIssueNumber] = useState('');
    const [address, setAddress] = useState('');
    const [candidateEmail, setCandidateEmail] = useState('');
    const [piDept, setPiDept] = useState('');

    const [scdDocName, setScdDocName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const { call: fetchSCRFields } = useFrappePostCall(selectionCommitteeReportAPI.getFields);
    const { call: fetchCandidateByApplication } = useFrappePostCall(selectionCandidateDetailsAPI.getByApplication);
    const { call: updateAppointmentOrderNumber } = useFrappePostCall(selectionCandidateDetailsAPI.updateAppointmentOrderNumber);
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>('frappe.client.get_value');

    useEffect(() => {
        if (!scrName && !applicationId) { setLoading(false); return; }
        (async () => {
            setLoading(true);
            try {
                // Fetch both sources in parallel
                const [scrRes, scdRes] = await Promise.all([
                    scrName ? fetchSCRFields({ doc_name: scrName }) : Promise.resolve(null),
                    applicationId ? fetchCandidateByApplication({ application_id: applicationId }) : Promise.resolve(null),
                ]);

                // ── SCR: project/pay data ──
                const prefill = scrRes?.message?.prefill_data;
                if (prefill) {
                    setProjectNumber(prefill.project_number || '');
                    setProjectName(prefill.project_name || '');
                    setRecruitmentType(prefill.recruitment_type || '');

                    const candidates: Candidate[] =
                        typeof prefill.candidates === 'string'
                            ? JSON.parse(prefill.candidates)
                            : (prefill.candidates || []);

                    const postDetails: PostDetail[] = Array.isArray(prefill.post_details)
                        ? prefill.post_details : [];

                    const found = candidates.find(c =>
                        String(c.application_id) === String(applicationId)
                    );
                    if (found) {
                        setCandidate(found);
                        const post = postDetails.find(
                            p => p.name === found.recruitment_post_id ||
                                p.upfa_designation?.toLowerCase() === found.applied_post?.toLowerCase()
                        );
                        setDuration(post?.upfa_duration_months ?? 0);
                    }

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

                // ── SCD: contact info — name/email/address come from here ──
                const scdDocs = scdRes?.message?.data;
                if (Array.isArray(scdDocs) && scdDocs.length > 0) {
                    const scd = scdDocs[0];
                    if (scd.name) setScdDocName(scd.name);
                    setCandidate(prev => prev ? { ...prev, candidate_name: scd.candidate_name || prev.candidate_name, candidate_surname: scd.candidate_surname || '' } : prev);
                    if (scd.email) setCandidateEmail(scd.email);
                    if (scd.correspondence_address) setAddress(scd.correspondence_address);
                    if (scd.recruitment_type) setRecruitmentType(scd.recruitment_type);
                    if (scd.appointment_order_number) {
                        const projNum = scrRes?.message?.prefill_data?.project_number || '';
                        const raw = String(scd.appointment_order_number);
                        const stripped = projNum && raw.startsWith(`${projNum}/`)
                            ? raw.slice(projNum.length + 1)
                            : raw.includes('/') ? raw.split('/').slice(1).join('/') : raw;
                        setIssueNumber(stripped);
                    }
                }
            } catch (e) {
                console.error('AppointmentOrder load error:', e);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrName, applicationId]);

    const fullName = candidate
        ? capitalizeName([candidate.candidate_name, candidate.candidate_surname].filter(Boolean).join(' '))
        : '';
    const today = (() => {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}-${mm}-${d.getFullYear()}`;
    })();
    const deanName = 'Prof. Rohit Sinha';
    const deanTitle = 'Dean';
    const deanPhone = '+91-361-2582082';
    const deanEmail = 'dornd@iitg.ac.in';
    const signatory = 'Dean, R&D';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans">
                <div className="flex items-center gap-3 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] px-5 py-4 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-[#D97757]" />
                    <span className="text-sm font-semibold text-[#71717A] dark:text-[#A1A1AA]">Loading appointment order</span>
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
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Appointment Order</p>
                        <p className="truncate text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{fullName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                if (!issueNumber) return;
                                if (!scdDocName) { setSaveStatus('error'); return; }
                                setSaving(true);
                                setSaveStatus('idle');
                                try {
                                    const res = await updateAppointmentOrderNumber({
                                        docname: scdDocName,
                                        appointment_order_number: `${projectNumber}/${issueNumber}`,
                                    });
                                    setSaveStatus(res?.message?.status === 'success' ? 'success' : 'error');
                                } catch {
                                    setSaveStatus('error');
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving || !issueNumber}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-4 text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7] shadow-sm transition-colors hover:border-[#D97757]/40 hover:bg-[#D97757]/10 hover:text-[#D97757] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            {saving ? 'Saving…' : saveStatus === 'success' ? 'Saved ✓' : saveStatus === 'error' ? 'Error ✗' : 'Save Ref'}
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

                    {/* ── HEADER : logo left | contact right ── */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '64%', verticalAlign: 'top', padding: '6px 10px 10px 0', borderBottom: '2px solid black' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        {/* Old Server Frappe IP Logo (Commented out): */}
                                        {/* <img src="http://172.16.131.206:8000/files/IITG_logo.png" alt="IITG" style={{ width: '55px', height: 'auto', flexShrink: 0 }} /> */}
                                        {/* Local Development Frappe IP Logo (Centralized via FRAPPE_BASE_URL): */}
                                        <img
                                            src={`${FRAPPE_BASE_URL}/files/IITG_logo.png`}
                                            alt="IITG"
                                            style={{ width: '55px', height: 'auto', flexShrink: 0 }}
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '12.5px' }}>
                                                Research and Development Section
                                            </strong>
                                            <strong style={{ display: 'block', fontSize: '11.5px', marginTop: '3px' }}>
                                                Indian Institute of Technology Guwahati<br />
                                                Guwahati–781039, Assam, India
                                            </strong>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ width: '36%', verticalAlign: 'top', padding: '6px 0 10px 10px', borderLeft: '1px solid #ccc', borderBottom: '2px solid black' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <tbody>
                                            <tr>
                                                <td>Guwahati-781039</td>
                                            </tr>
                                            <tr>
                                                <td>Phone : {deanPhone}</td>
                                            </tr>
                                            <tr>
                                                <td>email: {deanEmail}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '24px' }}>
                        <tbody>
                            <tr>
                                <td style={{ verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: 'bold' }}>{deanName}</div>
                                    <div style={{ fontWeight: 'bold' }}>{deanTitle}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ── Ref & Date ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
                        <span>
                            <strong style={{ color: '#b00' }}>Ref:</strong> {projectNumber}/
                            <input
                                type="text"
                                value={issueNumber}
                                onChange={e => setIssueNumber(e.target.value)}
                                placeholder="Issue No."
                                maxLength={140}
                                className="ao-input"
                                style={{ width: '100px' }}
                            />
                            <InlineCharLimitWarn value={issueNumber} maxLength={140} />
                        </span>
                        <span><strong style={{ color: '#b00' }}>Date:</strong>{today}</span>
                    </div>

                    {/* ── To block ── */}
                    <div style={{ marginTop: '18px' }}>
                        <div><strong>To,</strong></div>
                        <div style={{ marginTop: '2px' }}><strong>{fullName}</strong></div>
                        <textarea
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="Enter full address…"
                            rows={3}
                            maxLength={65535}
                            className="ao-input"
                            style={{ marginTop: '4px' }}
                        />
                        <InlineCharLimitWarn value={address} maxLength={65535} />
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span>(E-mail id:</span>
                            <input
                                type="text"
                                value={candidateEmail}
                                onChange={e => setCandidateEmail(e.target.value)}
                                placeholder="candidate@email.com"
                                maxLength={140}
                                className="ao-input"
                                style={{ width: '230px' }}
                            />
                            <InlineCharLimitWarn value={candidateEmail} maxLength={140} />
                            <span>)</span>
                        </div>
                    </div>

                    {/* ── Subject ── */}
                    <div style={{ marginTop: '20px', lineHeight: '1.6' }}>
                        <strong>Sub.:</strong>{' '}
                        <strong>Temporary {recruitmentType}</strong> engagement for the post of{' '}
                        <strong>{candidate.applied_post}</strong> in the Project entitled{' '}
                        "<strong>{projectName}</strong>" in the Dept. of{' '}
                        <input
                            type="text"
                            value={piDept}
                            onChange={e => setPiDept(e.target.value)}
                            placeholder="Dept. Name"
                            maxLength={140}
                            className="ao-input"
                            style={{ width: '180px' }}
                        />
                        <InlineCharLimitWarn value={piDept} maxLength={140} />{' '}
                        under Dr. <strong>{piName}</strong>.
                    </div>

                    {/* ── Salutation ── */}
                    <div style={{ marginTop: '18px' }}>
                        <p style={{ marginBottom: '10px' }}>Dear <strong>{fullName}</strong>,</p>
                        <p style={{ textAlign: 'justify', lineHeight: '1.6', textIndent: '2em' }}>
                            Inviting reference to your application for the above post of{' '}
                            <strong>{candidate.applied_post}</strong> and subsequent interview, you are
                            offered the post of <strong>{candidate.applied_post}</strong> in the said
                            project under the following terms &amp; conditions:
                        </p>
                    </div>

                    {/* ── Terms ── */}
                    <table style={{ borderCollapse: 'collapse', width: '100%', margin: '14px 0', lineHeight: '1.65' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '130px', verticalAlign: 'top', paddingBottom: '8px', paddingRight: '4px' }}><strong>1.&nbsp;Post</strong></td>
                                <td style={{ width: '16px', verticalAlign: 'top', paddingBottom: '8px' }}>:</td>
                                <td style={{ textAlign: 'justify', verticalAlign: 'top', paddingBottom: '8px' }}>
                                    The post is purely temporary and contractual subject to / based on
                                    approval of the concerned funding agency. This engagement is for a
                                    period of <strong>{duration} months</strong> or co-terminus with the
                                    project whichever is earlier. It is terminable by giving in writing
                                    one month's notice on either side.{' '}
                                    <strong>
                                        This is a temporary contractual engagement for the already specified
                                        project only and not for IIT Guwahati.
                                    </strong>{' '}
                                    The engagement will stand automatically terminated at the end of the
                                    specified period unless renewed or will co-terminate with the project
                                    whichever is earlier.{' '}
                                    <strong>
                                        This engagement neither confers any right to you for future
                                        absorption in the Institute in any capacity nor any forms of
                                        relaxation / concession to you for applying for any post in the
                                        Institute in future.
                                    </strong>
                                </td>
                            </tr>
                            <tr>
                                <td style={{ width: '130px', verticalAlign: 'top', paddingBottom: '8px', paddingRight: '4px' }}><strong>2.&nbsp;Scale of pay</strong></td>
                                <td style={{ width: '16px', verticalAlign: 'top', paddingBottom: '8px' }}>:</td>
                                <td style={{ textAlign: 'justify', verticalAlign: 'top', paddingBottom: '8px' }}>
                                    <strong>Rs. {Number(candidate.basic_pay).toLocaleString('en-IN')}/- p.m.</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style={{ width: '130px', verticalAlign: 'top', paddingBottom: '8px', paddingRight: '4px' }}><strong>3.&nbsp;Initial pay admissible</strong></td>
                                <td style={{ width: '16px', verticalAlign: 'top', paddingBottom: '8px' }}>:</td>
                                <td style={{ textAlign: 'justify', verticalAlign: 'top', paddingBottom: '8px' }}>
                                    Rs. {Number(candidate.total_amount).toLocaleString('en-IN')}/- per month (inclusive of HRA @ {candidate.hra})
                                </td>
                            </tr>
                            <tr>
                                <td style={{ width: '130px', verticalAlign: 'top', paddingBottom: '8px', paddingRight: '4px' }}><strong>4.&nbsp;Medical facility</strong></td>
                                <td style={{ width: '16px', verticalAlign: 'top', paddingBottom: '8px' }}>:</td>
                                <td style={{ textAlign: 'justify', verticalAlign: 'top', paddingBottom: '8px' }}>As per institute norms.</td>
                            </tr>
                            <tr>
                                <td style={{ width: '130px', verticalAlign: 'top', paddingBottom: '8px', paddingRight: '4px' }}><strong>5.&nbsp;Leave</strong></td>
                                <td style={{ width: '16px', verticalAlign: 'top', paddingBottom: '8px' }}>:</td>
                                <td style={{ textAlign: 'justify', verticalAlign: 'top', paddingBottom: '8px' }}>
                                    Leave admissible — Maximum 8 days Casual Leave and 30 days Earned Leave per
                                    calendar year, on pro-rata basis. No carry-over of leave to the next
                                    calendar year will be allowed.
                                </td>
                            </tr>
                            <tr>
                                <td style={{ width: '130px', verticalAlign: 'top', paddingBottom: '8px', paddingRight: '4px' }}><strong>6.&nbsp;Duties</strong></td>
                                <td style={{ width: '16px', verticalAlign: 'top', paddingBottom: '8px' }}>:</td>
                                <td style={{ textAlign: 'justify', verticalAlign: 'top', paddingBottom: '8px' }}>
                                    As prescribed for the post and as may be assigned by the Project
                                    Investigator and the authorities of the Institute.
                                </td>
                            </tr>
                            <tr>
                                <td style={{ width: '130px', verticalAlign: 'top', paddingBottom: '8px', paddingRight: '4px' }}><strong>7.&nbsp;Agreement</strong></td>
                                <td style={{ width: '16px', verticalAlign: 'top', paddingBottom: '8px' }}>:</td>
                                <td style={{ textAlign: 'justify', verticalAlign: 'top', paddingBottom: '8px' }}>
                                    This engagement is valid subject to your signing an agreement prescribed
                                    by the Institute and production of original documents.
                                </td>
                            </tr>
                            <tr>
                                <td style={{ width: '130px', verticalAlign: 'top', paddingBottom: '8px', paddingRight: '4px' }}><strong>8.&nbsp;Other facilities</strong></td>
                                <td style={{ width: '16px', verticalAlign: 'top', paddingBottom: '8px' }}>:</td>
                                <td style={{ textAlign: 'justify', verticalAlign: 'top', paddingBottom: '8px' }}>
                                    As per norms laid down for project staff from time to time by the
                                    Institute. No Institute accommodation will be provided.
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ── Joining instruction ── */}
                    <p style={{ marginTop: '10px', textAlign: 'justify', lineHeight: '1.65', textIndent: '2em' }}>
                        If the offer is acceptable to you on the terms and conditions stated above, you
                        should inform us within 10 days from the date of issue of this letter and join
                        duties within 20 days of the stipulated date. If no response is received from
                        your end within the specified period, it will be presumed that you are not
                        interested in this offer and the offer will be withdrawn. You are also requested
                        to bring the release order from your present employer, if you are employed.
                        Please also bring your original documents concerning your educational
                        qualification.
                    </p>

                    {/* ── Contractual note ── */}
                    <p style={{ marginTop: '8px', textAlign: 'justify', lineHeight: '1.65', textIndent: '2em' }}>
                        It is to be noted that this contractual offer letter is issued on behalf of the
                        funding agency by IIT Guwahati. On acceptance of this offer, you will be
                        employee of the concerned project and not of IIT Guwahati.
                    </p>

                    {/* ── Signatory ── */}
                    <div style={{ marginTop: '50px', textAlign: 'right' }}>
                        <p>Yours sincerely,</p>
                        <p style={{ marginTop: '48px', fontWeight: 'bold' }}>{signatory}</p>
                    </div>

                    {/* ── Copy to ── */}
                    <div style={{ marginTop: '24px', fontSize: '11px', color: '#222' }}>
                        <strong>Copy to:</strong>
                        <p style={{ margin: '3px 0 0 1.5em' }}>
                            HOD — Dept. of{' '}
                            <input
                                type="text"
                                value={piDept}
                                onChange={e => setPiDept(e.target.value)}
                                placeholder="Dept. Name"
                                maxLength={140}
                                className="ao-input"
                                style={{ width: '160px' }}
                            />
                            <InlineCharLimitWarn value={piDept} maxLength={140} />
                        </p>
                        <p style={{ margin: '3px 0 0 1.5em' }}>
                            Dr. {piName}; Principal Investigator; Dept. of {piDept || '___________'}
                        </p>
                    </div>

                    <div style={{
                        marginTop: '28px',
                        borderTop: '1px solid #222',
                        borderBottom: '1px solid #222',
                        padding: '5px 0',
                        textAlign: 'center',
                        fontSize: '10.5px',
                        fontWeight: 'bold',
                    }}>
                        This is a computer-generated document and does not require signature.
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AppointmentOrderPage;
