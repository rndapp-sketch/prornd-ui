import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { selectionCommitteeReportAPI } from '@/services/apiService';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';

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
    id: string;
    candidate_name: string;
    application_id: string;
    recruitment_post_id: string;
    candidate_id: string;
    applied_post: string;
    basic_pay: number;
    hra: string;
    medical_required: string;
    total_amount: number;
    recommendation: string;
};

type PostDetail = {
    name: string;
    upfa_designation: string;
    upfa_duration_months: number;
};

// ─── Component ────────────────────────────────────────────────────────────────
const AppointmentOrderPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);

    const scrName = searchParams.get('scr') || '';
    const candidateId = searchParams.get('candidate_id') || '';

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
    const [joiningText, setJoiningText] = useState('within 15 days of receipt of this letter');
    const [extraNote, setExtraNote] = useState('');

    const { call: fetchSCRFields } = useFrappePostCall(selectionCommitteeReportAPI.getFields);
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>('frappe.client.get_value');

    useEffect(() => {
        if (!scrName) return;
        (async () => {
            setLoading(true);
            try {
                const res = await fetchSCRFields({ doc_name: scrName });
                const prefill = res?.message?.prefill_data;
                if (!prefill) return;

                setProjectNumber(prefill.project_number || '');
                setProjectName(prefill.project_name || '');
                setRecruitmentType(prefill.recruitment_type || '');

                const candidates: Candidate[] =
                    typeof prefill.candidates === 'string'
                        ? JSON.parse(prefill.candidates)
                        : (prefill.candidates || []);

                const postDetails: PostDetail[] = Array.isArray(prefill.post_details)
                    ? prefill.post_details : [];

                const found = candidates.find(c => String(c.candidate_id) === String(candidateId));
                if (found) {
                    setCandidate(found);
                    const post = postDetails.find(
                        p => p.name === found.recruitment_post_id ||
                            p.upfa_designation?.toLowerCase() === found.applied_post?.toLowerCase()
                    );
                    setDuration(post?.upfa_duration_months ?? 0);
                }

                if (prefill.principal_investigator) {
                    try {
                        const ur = await fetchFrappeValue({
                            doctype: 'User',
                            name: prefill.principal_investigator,
                            fieldname: 'full_name',
                        });
                        setPiName(ur?.message?.full_name || prefill.principal_investigator);
                    } catch {
                        setPiName(prefill.principal_investigator);
                    }
                }
            } catch (e) {
                console.error('AppointmentOrder load error:', e);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrName, candidateId]);

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const isAdhoc = recruitmentType?.toLowerCase() === 'adhoc';
    const signatory = isAdhoc ? 'Associate Dean, R&D' : 'Dean, R&D';

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
                        <p className="truncate text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{candidate.candidate_name}</p>
                    </div>
                <button
                    onClick={() => window.print()}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#D97757] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#c66a4e]"
                >
                    <Printer size={15} />
                    Print
                </button>
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
                                {/* Left */}
                                <td style={{ width: '64%', verticalAlign: 'top', padding: '6px 10px 10px 0', borderBottom: '2px solid black' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <img
                                            src="http://172.16.131.206:8000/files/IITG_logo.png"
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
                                {/* Right */}
                                <td style={{ width: '36%', verticalAlign: 'top', padding: '6px 0 10px 10px', borderLeft: '1px solid #ccc', borderBottom: '2px solid black' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', paddingRight: '4px', width: '70px' }}>Phone Nos.</td>
                                                <td style={{ width: '8px' }}>:</td>
                                                <td>+91-361-258-2134</td>
                                            </tr>
                                            <tr>
                                                <td></td><td>:</td>
                                                <td>+91-361-258-2135</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 'bold' }}>Fax</td>
                                                <td>:</td>
                                                <td>+91-361-258-2089</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 'bold' }}>Email</td>
                                                <td>:</td>
                                                <td>dornd@iitg.ac.in</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ── Ref & Date ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '14px' }}>
                        <span>
                            <strong>Ref:</strong> {projectNumber}/
                            <input
                                type="text"
                                value={issueNumber}
                                onChange={e => setIssueNumber(e.target.value)}
                                placeholder="Issue No."
                                className="ao-input"
                                style={{ width: '100px' }}
                            />
                        </span>
                        <span><strong>Date:</strong> {today}</span>
                    </div>

                    {/* ── To block ── */}
                    <div style={{ marginTop: '20px' }}>
                        <div><strong>To,</strong></div>
                        <div><strong>{candidate.candidate_name}</strong></div>
                        <textarea
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="Enter full address…"
                            rows={3}
                            className="ao-input"
                            style={{ marginTop: '4px' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                            <span>Email:</span>
                            <input
                                type="text"
                                value={candidateEmail}
                                onChange={e => setCandidateEmail(e.target.value)}
                                placeholder="candidate@email.com"
                                className="ao-input"
                                style={{ width: '230px' }}
                            />
                        </div>
                    </div>

                    {/* ── Subject ── */}
                    <div style={{ marginTop: '20px', lineHeight: '1.6' }}>
                        <strong>Sub:</strong>{' '}
                        Temporary {recruitmentType} engagement for the post of{' '}
                        <strong>{candidate.applied_post}</strong> in the project titled{' '}
                        "<strong>{projectName}</strong>" under Dr. {piName}.
                    </div>

                    {/* ── Salutation ── */}
                    <div style={{ marginTop: '18px' }}>
                        <p style={{ marginBottom: '10px' }}>Dear <strong>{candidate.candidate_name}</strong>,</p>
                        <p style={{ textAlign: 'justify', lineHeight: '1.6' }}>
                            With reference to your application and subsequent interview, you are hereby
                            offered the post of <strong>{candidate.applied_post}</strong> under the
                            following terms and conditions:
                        </p>
                    </div>

                    {/* ── Terms ── */}
                    <ol style={{ listStyleType: 'decimal', paddingLeft: '22px', margin: '14px 0', lineHeight: '1.6' }}>
                        {[
                            <>
                                <strong>Post:</strong> The post is purely temporary and contractual for a
                                period of <strong>{duration} month{duration !== 1 ? 's' : ''}</strong> or
                                co-terminus with the project, whichever is earlier.
                            </>,
                            <>
                                <strong>Scale of Pay:</strong> Rs.&nbsp;
                                <strong>{Number(candidate.basic_pay).toLocaleString('en-IN')}</strong>/- per month.
                            </>,
                            <>
                                <strong>Initial Pay Admissible:</strong> Rs.&nbsp;
                                <strong>{Number(candidate.total_amount).toLocaleString('en-IN')}</strong>/- per month
                                (inclusive of HRA @ {candidate.hra}).
                            </>,
                            <><strong>Medical Facility:</strong> As per institute norms.</>,
                            <><strong>Leave:</strong> As per applicable rules.</>,
                            <><strong>Duties:</strong> As assigned by the Principal Investigator / Institute from time to time.</>,
                            <>
                                <strong>Agreement:</strong> The appointment is subject to signing of the
                                agreement form and production of all original documents for verification
                                at the time of joining.
                            </>,
                            <>
                                <strong>Other Facilities:</strong> As per institute norms. No accommodation
                                will be provided by the Institute.
                            </>,
                        ].map((item, i) => (
                            <li key={i} style={{ marginBottom: '7px', textAlign: 'justify' }}>{item}</li>
                        ))}
                    </ol>

                    {/* ── Joining instruction ── */}
                    <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
                        <span style={{ textAlign: 'justify' }}>
                            If the above terms and conditions are acceptable to you, kindly join{' '}
                            <input
                                type="text"
                                value={joiningText}
                                onChange={e => setJoiningText(e.target.value)}
                                className="ao-input"
                                style={{ width: '280px' }}
                            />.
                        </span>
                    </div>

                    {/* ── Extra note (optional) ── */}
                    {(extraNote || true) && (
                        <div style={{ marginTop: '8px' }}>
                            <textarea
                                value={extraNote}
                                onChange={e => setExtraNote(e.target.value)}
                                placeholder="Additional note (optional)…"
                                rows={2}
                                className="ao-input"
                            />
                        </div>
                    )}

                    {/* ── Signatory ── */}
                    <div style={{ marginTop: '50px' }}>
                        <p>Yours sincerely,</p>
                        <div style={{ marginTop: '42px' }}>
                            <p style={{
                                fontWeight: 'bold',
                                borderTop: '1px solid black',
                                paddingTop: '4px',
                                display: 'inline-block',
                                paddingRight: '64px',
                            }}>
                                {signatory}
                            </p>
                            <p style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>IIT Guwahati</p>
                        </div>
                    </div>

                    {/* ── Copy to ── */}
                    <div style={{ marginTop: '32px', paddingTop: '8px', borderTop: '1px solid #ccc', fontSize: '11px', color: '#444' }}>
                        <strong style={{ color: '#222' }}>Copy to:</strong>
                        <div style={{ marginTop: '3px' }}>1. Project File</div>
                        <div>2. Accounts Section, IIT Guwahati</div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AppointmentOrderPage;
