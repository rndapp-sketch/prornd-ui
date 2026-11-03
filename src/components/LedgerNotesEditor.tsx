import { useEffect, useRef, useState } from "react";
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { useUserRoles } from "@/components/UserRole";
import { ledgerNotesAPI } from "@/services/apiService";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
    Heading1, Heading2, List, ListOrdered, ListChecks, Quote, Code,
    AlignLeft, AlignCenter, AlignRight, Link2, Undo2, Redo2, Minus, Check, Loader2, Lock, AlertTriangle, RefreshCw, Download, Palette, Eye, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NoteReference {
    /** Unique per click, so re-clicking the same row re-focuses its note. */
    key: number;
    tid: string | number;
    /** Short description shown after the TID, e.g. date · particulars · amount. */
    summary: string;
}

const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Props {
    reference?: NoteReference | null;
    /** Project Registration name or project_no; the server accepts either. */
    projectName: string;
    /** Drop the card chrome/title (used inside a floating window that supplies its own). */
    embedded?: boolean;
}

const ToolButton = ({ active, disabled, onClick, title, children }: {
    active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cn(
            "h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-30",
            active
                ? "bg-[#D97757] text-white"
                : "text-[#71717A] dark:text-[#A1A1AA] hover:bg-white dark:hover:bg-[#27272A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]",
        )}
    >
        {children}
    </button>
);

const TEXT_COLORS = [
    { name: "Black", value: "#000000" },
    { name: "Dark grey", value: "#52525B" },
    { name: "Red", value: "#DC2626" },
    { name: "Orange", value: "#EA580C" },
    { name: "Green", value: "#16A34A" },
    { name: "Blue", value: "#2563EB" },
    { name: "Purple", value: "#7C3AED" },
    { name: "Pink", value: "#DB2777" },
];

const ColorPicker = ({ editor }: { editor: Editor }) => {
    const [open, setOpen] = useState(false);
    const current = (editor.getAttributes("textStyle").color as string | undefined) || "";
    return (
        <div className="relative">
            <ToolButton title="Text colour" active={open} onClick={() => setOpen((o) => !o)}>
                <span className="flex flex-col items-center leading-none">
                    <Palette className="h-4 w-4" />
                    <span className="mt-0.5 h-[3px] w-4 rounded-full" style={{ background: current || "#000000" }} />
                </span>
            </ToolButton>
            {open && (
                <div className="absolute left-0 top-9 z-30 flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-2 shadow-lg">
                    {TEXT_COLORS.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            title={c.name}
                            aria-label={c.name}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { editor.chain().focus().setColor(c.value).run(); setOpen(false); }}
                            className={cn("h-6 w-6 rounded-full border border-black/10 transition-transform hover:scale-110", current.toLowerCase() === c.value.toLowerCase() && "ring-2 ring-offset-1 ring-[#D97757]")}
                            style={{ background: c.value }}
                        />
                    ))}
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { editor.chain().focus().unsetColor().run(); setOpen(false); }}
                        className="ml-1 px-2 h-6 rounded-md text-[11px] font-bold text-[#71717A] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B]"
                    >
                        Default
                    </button>
                </div>
            )}
        </div>
    );
};

const Divider = () => <span className="w-px h-5 bg-[#E4E4E7] dark:bg-[#3F3F46] mx-1" />;

interface LedgerNoteRow {
    name: string;
    transaction_id?: string | null;
    content?: string | null;
    modified: string;
}

type SaveState = "loading" | "saved" | "saving" | "error" | "conflict";

const legacyKey = (projectName: string) => `project-ledger-notes:${projectName}`;

const Toolbar = ({ editor }: { editor: Editor }) => {
    const setLink = () => {
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Link URL (leave empty to remove)", prev || "https://");
        if (url === null) return;
        if (url.trim() === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    };
    const c = () => editor.chain().focus();
    const sz = "h-4 w-4";

    return (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
            <ToolButton title="Undo" disabled={!editor.can().undo()} onClick={() => c().undo().run()}><Undo2 className={sz} /></ToolButton>
            <ToolButton title="Redo" disabled={!editor.can().redo()} onClick={() => c().redo().run()}><Redo2 className={sz} /></ToolButton>
            <Divider />
            <ToolButton title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => c().toggleHeading({ level: 1 }).run()}><Heading1 className={sz} /></ToolButton>
            <ToolButton title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className={sz} /></ToolButton>
            <Divider />
            <ToolButton title="Bold" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold className={sz} /></ToolButton>
            <ToolButton title="Italic" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><Italic className={sz} /></ToolButton>
            <ToolButton title="Underline" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}><UnderlineIcon className={sz} /></ToolButton>
            <ToolButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}><Strikethrough className={sz} /></ToolButton>
            <ColorPicker editor={editor} />
            <ToolButton title="Highlight" active={editor.isActive("highlight")} onClick={() => c().toggleHighlight().run()}><Highlighter className={sz} /></ToolButton>
            <ToolButton title="Inline code" active={editor.isActive("code")} onClick={() => c().toggleCode().run()}><Code className={sz} /></ToolButton>
            <Divider />
            <ToolButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List className={sz} /></ToolButton>
            <ToolButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered className={sz} /></ToolButton>
            <ToolButton title="Checklist" active={editor.isActive("taskList")} onClick={() => c().toggleTaskList().run()}><ListChecks className={sz} /></ToolButton>
            <ToolButton title="Quote" active={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}><Quote className={sz} /></ToolButton>
            <Divider />
            <ToolButton title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => c().setTextAlign("left").run()}><AlignLeft className={sz} /></ToolButton>
            <ToolButton title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => c().setTextAlign("center").run()}><AlignCenter className={sz} /></ToolButton>
            <ToolButton title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => c().setTextAlign("right").run()}><AlignRight className={sz} /></ToolButton>
            <Divider />
            <ToolButton title="Link" active={editor.isActive("link")} onClick={setLink}><Link2 className={sz} /></ToolButton>
            <ToolButton title="Divider line" onClick={() => c().setHorizontalRule().run()}><Minus className={sz} /></ToolButton>
        </div>
    );
};

const LedgerNotesEditor = ({ projectName, embedded, reference }: Props) => {
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser || null);
    // Server enforces this too; the UI check just avoids offering edits that would be rejected.
    const canEdit = roles.includes("staff, RnD");

    const { data, error: loadError, isValidating, mutate } = useFrappeGetCall<{ message: LedgerNoteRow[] }>(
        ledgerNotesAPI.list,
        { project_no: projectName },
        `ledger-notes-${projectName}`,
    );
    const loadErrorText = loadError
        ? [loadError.httpStatus, loadError.exc_type, loadError.message || loadError.exception].filter(Boolean).join(" · ") || "request failed"
        : "";
    const { call: saveNote } = useFrappePostCall(ledgerNotesAPI.save);

    const [saveState, setSaveState] = useState<SaveState>("loading");
    const [hydrated, setHydrated] = useState(false);
    const [mode, setMode] = useState<"edit" | "view">("view");
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [legacyDraft, setLegacyDraft] = useState<string>("");

    const hydratedFor = useRef<string | null>(null);
    const modifiedRef = useRef<string | undefined>(undefined);
    const lastSaved = useRef<string>("");
    const inFlight = useRef(false);
    const dirty = useRef(false);
    const importPending = useRef(false);
    const handledRef = useRef<number | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
            TextStyle,
            Color,
            Highlight,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Placeholder.configure({ placeholder: "Write notes about this ledger — reconciliations, follow-ups, reminders…" }),
        ],
        content: "",
        editable: false,
        shouldRerenderOnTransaction: true, // toolbar active states and word count follow the cursor
        editorProps: { attributes: { class: "ledger-notes-prose focus:outline-none min-h-[220px] px-5 py-4" } },
    });

    // Load the project's general note (the row with an empty transaction_id) from the server.
    useEffect(() => {
        if (!editor || !data || isValidating || hydratedFor.current === projectName) return;
        const row = (data.message || []).find((r) => !r.transaction_id);
        const html = row?.content || "";
        editor.commands.setContent(html, { emitUpdate: false });
        modifiedRef.current = row?.modified;
        lastSaved.current = html;
        hydratedFor.current = projectName;
        setHydrated(true);
        setSaveState("saved");
        // Notes written before server storage existed live in this browser only.
        setLegacyDraft(!row ? localStorage.getItem(legacyKey(projectName)) || "" : "");
    }, [editor, data, isValidating, projectName]);

    // A different project means a different note: drop the loaded state.
    useEffect(() => {
        if (hydratedFor.current && hydratedFor.current !== projectName) {
            hydratedFor.current = null;
            setHydrated(false);
            setSaveState("loading");
        }
    }, [projectName]);

    const locked = saveState === "conflict";
    const editing = canEdit && mode === "edit";
    useEffect(() => {
        // emitUpdate=false: toggling editability must not look like a content edit (it would re-trigger autosave).
        editor?.setEditable(editing && hydrated && !locked, false);
    }, [editor, editing, hydrated, locked]);

    // Clicking a ledger TID means the user wants to write: leave view mode.
    useEffect(() => {
        if (reference) setMode("edit");
    }, [reference?.key]); // eslint-disable-line react-hooks/exhaustive-deps

    const flush = async () => {
        if (!editor || !canEdit || !hydrated) return;
        if (inFlight.current) {
            dirty.current = true;
            return;
        }
        const html = editor.isEmpty ? "" : editor.getHTML();
        if (html === lastSaved.current) {
            setSaveState("saved");
            return;
        }
        inFlight.current = true;
        dirty.current = false;
        setSaveState("saving");
        try {
            const res = (await saveNote({
                project_no: projectName,
                content: html,
                transaction_id: "",
                ...(modifiedRef.current ? { modified: modifiedRef.current } : {}),
            })) as { message?: { name?: string; modified?: string } };
            modifiedRef.current = res?.message?.modified ?? modifiedRef.current;
            lastSaved.current = html;
            if (importPending.current) {
                localStorage.removeItem(legacyKey(projectName));
                importPending.current = false;
            }
            // Keep the SWR cache in step so a reopened window never loads a stale note.
            mutate(
                {
                    message: [{
                        name: res?.message?.name ?? "",
                        transaction_id: "",
                        content: html,
                        modified: modifiedRef.current ?? "",
                    }],
                },
                false,
            );
            setSavedAt(new Date());
            setSaveState("saved");
        } catch (e) {
            const err = e as { exc_type?: string; exception?: string; message?: string };
            const text = `${err?.exc_type ?? ""} ${err?.exception ?? ""} ${err?.message ?? ""}`;
            setSaveState(text.includes("TimestampMismatchError") ? "conflict" : "error");
            dirty.current = false;
        } finally {
            inFlight.current = false;
            if (dirty.current) flush();
        }
    };
    const flushRef = useRef(flush);
    flushRef.current = flush;

    // Autosave (debounced) on every edit; flush any pending edit when the editor goes away.
    useEffect(() => {
        if (!editor || !canEdit || !hydrated) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const onUpdate = ({ transaction }: { transaction: { docChanged: boolean } }) => {
            if (!transaction.docChanged) return;
            clearTimeout(timer);
            timer = setTimeout(() => flushRef.current(), 600);
            setSaveState((s) => (s === "conflict" ? s : "saving"));
        };
        editor.on("update", onUpdate);
        return () => {
            editor.off("update", onUpdate);
            if (timer) {
                clearTimeout(timer);
                flushRef.current();
            }
        };
    }, [editor, canEdit, hydrated]);

    // A ledger row was clicked: jump to its note block (or add one) and leave the cursor ready to type.
    useEffect(() => {
        if (!editor || !reference || !editing || !hydrated || saveState === "conflict") return;
        if (handledRef.current === reference.key) return;
        handledRef.current = reference.key;
        const label = `TID ${reference.tid}`;
        let quoteEnd = -1;
        editor.state.doc.descendants((node, pos) => {
            if (quoteEnd < 0 && node.type.name === "blockquote" && node.textContent.startsWith(`${label} ·`)) {
                quoteEnd = pos + node.nodeSize;
            }
            return quoteEnd < 0;
        });
        if (quoteEnd < 0) {
            const end = editor.state.doc.content.size;
            editor.chain().insertContentAt(end, `<blockquote><p><strong>${escapeHtml(label)}</strong> · ${escapeHtml(reference.summary)}</p></blockquote><p></p>`).run();
            editor.commands.focus("end", { scrollIntoView: true });
            return;
        }
        const next = editor.state.doc.resolve(quoteEnd).nodeAfter;
        if (!next || next.type.name !== "paragraph") {
            editor.chain().insertContentAt(quoteEnd, "<p></p>").run();
        }
        const target = editor.state.doc.resolve(quoteEnd).nodeAfter;
        editor.commands.focus(quoteEnd + (target ? target.nodeSize - 1 : 0), { scrollIntoView: true });
    }, [editor, reference?.key, editing, hydrated, saveState]); // eslint-disable-line react-hooks/exhaustive-deps

    const importLegacy = () => {
        if (!editor) return;
        importPending.current = true;
        editor.commands.setContent(legacyDraft, { emitUpdate: true });
        setLegacyDraft("");
    };

    const reloadLatest = () => {
        hydratedFor.current = null;
        setHydrated(false);
        setSaveState("loading");
        mutate();
    };

    if (!editor) return null;

    const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;

    return (
        <div className={cn("bg-white dark:bg-[#27272A] overflow-hidden", embedded ? "flex flex-col h-full" : "rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm")}>
            <div className={cn("flex items-center justify-between px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46]", embedded && "justify-end py-1.5")}>
                {!embedded && (
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#71717A] dark:text-[#A1A1AA]">Ledger</div>
                        <h2 className="text-[16px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">Notes</h2>
                    </div>
                )}
                <div className="flex items-center gap-3">
                {canEdit && (
                    <div className="flex items-center gap-0.5 rounded-lg bg-[#FAFAF9] dark:bg-[#18181B] p-0.5" role="group" aria-label="Notes mode">
                        {([["view", Eye, "View"], ["edit", Pencil, "Edit"]] as const).map(([m, Icon, label]) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMode(m)}
                                aria-pressed={mode === m}
                                className={cn(
                                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors",
                                    mode === m ? "bg-[#D97757] text-white" : "text-[#71717A] dark:text-[#A1A1AA] hover:bg-white dark:hover:bg-[#27272A]",
                                )}
                            >
                                <Icon className="h-3 w-3" /> {label}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                    {!canEdit ? (
                        <><Lock className="h-3.5 w-3.5" /> Read only</>
                    ) : loadError && !hydrated ? (
                        <button type="button" onClick={() => mutate()} title={loadErrorText} className="inline-flex items-center gap-1.5 text-red-600 hover:underline">
                            <AlertTriangle className="h-3.5 w-3.5" /> Couldn't load notes — retry
                        </button>
                    ) : saveState === "loading" || saveState === "saving" ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {saveState === "loading" ? "Loading…" : "Saving…"}</>
                    ) : saveState === "error" ? (
                        <button type="button" onClick={() => flush()} className="inline-flex items-center gap-1.5 text-red-600 hover:underline">
                            <AlertTriangle className="h-3.5 w-3.5" /> Not saved — retry
                        </button>
                    ) : saveState === "conflict" ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> Edited elsewhere</span>
                    ) : (
                        <span key={savedAt?.getTime() ?? 0} className="inline-flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-300">
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700 dark:text-emerald-400">
                                {savedAt ? `Saved at ${savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Saved"}
                            </span>
                        </span>
                    )}
                </div>
                </div>
            </div>

            {loadError && !hydrated && (
                <div className="px-5 py-2.5 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900/40 text-[12px] font-medium text-red-800 dark:text-red-300 break-words">
                    Could not load notes from the server: {loadErrorText}. Check that the Ledger Note backend is deployed and migrated on this site.
                </div>
            )}
            {saveState === "conflict" && (
                <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 text-[12px] font-medium text-amber-800 dark:text-amber-300">
                    <span>These notes were changed by someone else, so your last edit was not saved. Reload to see the latest version.</span>
                    <button type="button" onClick={reloadLatest} className="inline-flex items-center gap-1.5 shrink-0 font-bold hover:underline">
                        <RefreshCw className="h-3.5 w-3.5" /> Reload latest
                    </button>
                </div>
            )}
            {canEdit && legacyDraft && (
                <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900/40 text-[12px] font-medium text-blue-800 dark:text-blue-300">
                    <span>Notes saved earlier in this browser were found for this project.</span>
                    <button type="button" onClick={importLegacy} className="inline-flex items-center gap-1.5 shrink-0 font-bold hover:underline">
                        <Download className="h-3.5 w-3.5" /> Import to server
                    </button>
                </div>
            )}

            {editing && <Toolbar editor={editor} />}
            <div className={cn(embedded && "flex-1 min-h-0 overflow-y-auto")}>
                <EditorContent editor={editor} />
            </div>
            <div className="px-5 py-2 border-t border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] text-[#71717A] dark:text-[#A1A1AA] font-medium">
                {words} {words === 1 ? "word" : "words"}
            </div>
        </div>
    );
};

export default LedgerNotesEditor;
