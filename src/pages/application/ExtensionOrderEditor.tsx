import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Loader2, Printer, RotateCcw, Save } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { extensionAPI } from "@/services/apiService";
import { cn } from "@/lib/utils";
import {
  buildExtensionOrderPage,
  buildOrderDocument,
  type ExtensionOrderContext,
  type ExtensionOrderType,
} from "@/utils/extensionOrderPrint";

interface ExtensionOrderResponse {
  context: ExtensionOrderContext;
  order_html: string;
  order_no: string;
  order_printed: boolean;
  workflow_state: string;
}

// Editing affordances shown on screen only — never printed.
const EDITOR_CSS = `
  .page[contenteditable="true"] { outline: none; cursor: text; }
  .page[contenteditable="true"]:focus-within { box-shadow: 0 0 0 2px #4A6CF7, 0 2px 12px rgba(0,0,0,.2); }
`;

const getErrorText = (error: unknown, fallback: string) => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const e = error as { message?: string; exception?: string; _server_messages?: string };
    if (e._server_messages) {
      try {
        const msgs = JSON.parse(e._server_messages) as string[];
        const first = JSON.parse(msgs[0]) as { message?: string };
        if (first.message) return first.message.replace(/<[^>]+>/g, "");
      } catch { /* fall through */ }
    }
    if (e.exception) return e.exception.replace(/^[\w.]+Error:\s*/, "");
    if (e.message) return e.message;
  }
  return fallback;
};

/**
 * Extension / Re-engagement office order for an approved Project Staff Extension, opened
 * from R&D Staff's Pending Tasks ("Generate Ext Order") or Task Registry ("Ext Order"). The
 * order is editable in place; printing saves the edited copy, records who printed it and when,
 * and on the first print moves the extension from Approved to Completed. Reprints are allowed.
 */
const ExtensionOrderEditor: React.FC = () => {
  const { docname = "" } = useParams<{ docname: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: ExtensionOrderResponse }>(
    extensionAPI.getExtensionOrder,
    { docname },
    docname ? undefined : null,
    { revalidateOnFocus: false },
  );
  const { call: saveOrder } = useFrappePostCall<{ message: { status: string; workflow_state?: string } }>(
    extensionAPI.saveExtensionOrder,
  );

  const order = data?.message;
  const [orderType, setOrderType] = useState<ExtensionOrderType | null>(null);
  // Only the part typed after the "<project no>/" prefix; the saved Extension Order Number
  // and the letter's Ref line are the full "<project no>/<orderNo>".
  const [orderNo, setOrderNo] = useState("");
  // Initial page HTML loaded into the iframe; edits live in the iframe DOM after that.
  const [pageHtml, setPageHtml] = useState<string>("");
  // Bumped on every (re)generation so the iframe reloads and discards in-place edits.
  const [pageVersion, setPageVersion] = useState(0);
  const [busy, setBusy] = useState<"save" | "print" | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const refPrefix = order?.context.project_no ? `${order.context.project_no}/` : "";
  const fullOrderNo = orderNo.trim() ? `${refPrefix}${orderNo.trim()}` : "";

  const generate = (ctx: ExtensionOrderContext, type: ExtensionOrderType) =>
    buildExtensionOrderPage({ ...ctx, ref: fullOrderNo || ctx.ref, order_type: type }, format(new Date(), "yyyy-MM-dd"));

  // Seed once: the staff's last saved copy if any, else the generated order.
  useEffect(() => {
    if (!order || orderType) return;
    setOrderType(order.context.order_type);
    const saved = order.order_no || "";
    const prefix = order.context.project_no ? `${order.context.project_no}/` : "";
    setOrderNo(prefix && saved.startsWith(prefix) ? saved.slice(prefix.length) : saved);
    setPageHtml(order.order_html || generate(order.context, order.context.order_type));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  const editablePage = () => iframeRef.current?.contentDocument?.querySelector<HTMLElement>(".page") ?? null;
  const currentHtml = () => editablePage()?.innerHTML ?? pageHtml;

  // Writes the full order number into the letter's Ref line (first span of .refrow) —
  // works for generated pages and for copies saved before the number was entered.
  const syncRefLine = () => {
    const refSpan = editablePage()?.querySelector<HTMLElement>(".refrow > span:first-child");
    if (!refSpan) return;
    refSpan.innerHTML = "<b>Ref:</b> ";
    refSpan.appendChild(refSpan.ownerDocument.createTextNode(fullOrderNo || refPrefix));
  };

  useEffect(syncRefLine, [fullOrderNo, refPrefix]);

  const handleIframeLoad = () => {
    const page = editablePage();
    if (page) page.contentEditable = "true";
    syncRefLine();
  };

  const showNotice = (type: "success" | "error", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4500);
  };

  const regenerate = (type: ExtensionOrderType) => {
    if (!order) return;
    if (!window.confirm("Regenerate the order? Your edits on the current copy will be lost.")) return;
    setOrderType(type);
    setPageHtml(generate(order.context, type));
    setPageVersion((v) => v + 1);
  };

  const persist = async (markPrinted: boolean) =>
    saveOrder({
      docname,
      order_html: currentHtml(),
      order_type: orderType,
      order_no: fullOrderNo,
      mark_printed: markPrinted ? 1 : 0,
    });

  const handleSave = async () => {
    setBusy("save");
    try {
      await persist(false);
      showNotice("success", "Order saved.");
    } catch (err) {
      showNotice("error", getErrorText(err, "Could not save the order."));
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    if (!orderNo.trim()) {
      showNotice("error", "Enter the Extension Order Number before printing the order.");
      return;
    }
    setBusy("print");
    try {
      const res = await persist(true);
      if (order?.workflow_state === "Approved" && res?.message?.workflow_state === "Completed") {
        showNotice("success", "Order printed — the extension is now Completed.");
      }
      mutate();
    } catch (err) {
      showNotice("error", getErrorText(err, "Could not save the order before printing."));
      return;
    } finally {
      setBusy(null);
    }
    win.focus();
    win.print();
  };

  const ctx = order?.context;
  const title = orderType === "Re-engagement" ? "Re-engagement Order" : "Extension Order";

  return (
    <div className="min-h-screen bg-[#F9F7F2] dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        <PageHeader title={title} projectNumber={ctx?.project_no} status={orderType ?? undefined} backFallback="/task-registry">
          {order && (
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[13px] overflow-hidden"
                title="Extension Order Number (required to print)"
              >
                {refPrefix && (
                  <span className="pl-3 pr-1 py-2 text-[#71717A] dark:text-[#A1A1AA] whitespace-nowrap select-none">{refPrefix}</span>
                )}
                <input
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  disabled={!!busy}
                  placeholder="Order No. *"
                  maxLength={100}
                  className={cn("w-32 pr-3 py-2 bg-transparent outline-none text-[#27272A] dark:text-[#E4E4E7]", !refPrefix && "pl-3")}
                />
              </div>
              <select
                value={orderType ?? ""}
                onChange={(e) => regenerate(e.target.value as ExtensionOrderType)}
                disabled={!!busy}
                className="px-3 py-2 text-[13px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#27272A] dark:text-[#E4E4E7]"
                title="Order format"
              >
                <option value="Extension">Extension format</option>
                <option value="Re-engagement">Re-engagement format</option>
              </select>
              <button
                type="button"
                onClick={() => order && regenerate(orderType ?? order.context.order_type)}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-zinc-200 dark:border-zinc-700 text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-[#4A6CF7]/40 text-[#4A6CF7] hover:bg-[#4A6CF7]/10 disabled:opacity-50"
              >
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Print
              </button>
            </div>
          )}
        </PageHeader>

        {notice && (
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg text-sm border",
              notice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
            )}
          >
            {notice.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {notice.msg}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-[#71717A]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading order…
          </div>
        ) : error || !order ? (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm border bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {getErrorText(error, "Could not load the order.")}
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm border bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                {ctx?.staff_name} has completed <strong>{ctx?.total_months_completed}</strong> month(s) before this term
                {" "}— the <strong>{order.context.order_type}</strong> format applies
                {" "}({order.context.order_type === "Re-engagement" ? "a multiple of 11 months" : "not a multiple of 11 months"}).
                Click anywhere on the order to edit it. Save or Print keeps your edited copy.
                {order.workflow_state === "Approved"
                  ? " Printing marks the extension as Completed."
                  : order.order_printed && <strong> This order has been printed before — the extension is Completed.</strong>}
              </span>
            </div>
            {pageHtml && (
              <iframe
                key={pageVersion}
                ref={iframeRef}
                title={title}
                // No scripts run inside the order; same-origin lets this page edit and read it,
                // allow-modals lets the parent open its print dialog.
                sandbox="allow-same-origin allow-modals"
                srcDoc={buildOrderDocument(pageHtml, `${title} - ${ctx?.staff_name ?? ""}`, EDITOR_CSS)}
                onLoad={handleIframeLoad}
                className="w-full h-[80vh] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-200"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExtensionOrderEditor;
