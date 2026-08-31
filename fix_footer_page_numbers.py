import os
import re

directory = "src/pages/printformat"

# Map each template to its document label
doc_labels = {
    "temporary_advance_format.html":      "Temporary Advance Request",
    "icss_format.html":                   "Indent Cum Sanction Sheet",
    "icss_po_format.html":                "ICSS Purchase Order",
    "dp_format.html":                     "Direct Purchase",
    "dp_po_format.html":                  "DP Purchase Order",
    "po_format.html":                     "Purchase Order",
    "p_11_format.html":                   "P-11 Form",
    "sanction_sheet_format.html":         "Sanction Sheet",
    "disbursal_of_honorarium_format.html":"Disbursal of Honorarium",
    "disbursal_of_consultancy_format.html":"Disbursal of Consultancy",
    "top_up_fellowship_format.html":      "Top Up Fellowship",
    "ta_da_settlement_format.html":       "TA/DA Settlement",
    "igf_format.html":                    "IGF Form",
    "travel_director_review_format.html": "Travel Director Review",
}

for filename in os.listdir(directory):
    if not filename.endswith(".html"):
        continue
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    label = doc_labels.get(filename, "R&D Document")
    label_escaped = label.replace("&", "&amp;")

    # 1. Add counter CSS in @page rule
    if "@page {" in content and "counter-reset: page" not in content:
        content = content.replace(
            "@page {\n            size: A4;\n            margin: 0;\n        }",
            "@page {\n            size: A4;\n            margin: 0;\n        }\n\n        body {\n            counter-reset: page;\n        }"
        )

    # 2. Replace existing print-footer div content with a two-column layout
    # Pattern: any <div class="print-footer">...content...</div>
    content = re.sub(
        r'<div class="print-footer">[^<]*(?:<[^/][^>]*>[^<]*</[^>]+>[^<]*)*</div>',
        f'''<div class="print-footer">
    <span class="footer-left">Page <span class="page-num"></span></span>
    <span class="footer-right">Printed on: {{{{CURRENT_TIME}}}} &nbsp;|&nbsp; IIT Guwahati \u2014 R&amp;D Section &nbsp;|&nbsp; {label_escaped}</span>
</div>''',
        content,
        flags=re.DOTALL
    )

    # 3. Update the @media print .print-footer rule to use flexbox
    content = re.sub(
        r'(\.print-footer\s*\{[^}]*display: block !important;[^}]*\})',
        '''.print-footer {
                display: flex !important;
                justify-content: space-between;
                align-items: center;
                position: fixed;
                bottom: 8mm;
                right: 14mm;
                left: 14mm;
                font-size: 8pt;
                color: #888;
                border-top: 1px solid #ddd;
                padding-top: 4px;
                z-index: 100;
            }''',
        content
    )

    # 4. Add CSS for page-num counter via JS (since CSS counters don't work in fixed elements in Chrome)
    if 'class="page-num"' in content and 'page-num-script' not in content:
        script = """
<script id="page-num-script">
window.addEventListener('DOMContentLoaded', function() {
    // Inject page numbers via CSS counter hack for print
    var style = document.createElement('style');
    style.innerHTML = '@media print { body { counter-reset: page-counter; } .page-num::before { counter-increment: page-counter; content: counter(page-counter); } }';
    document.head.appendChild(style);
});
</script>"""
        content = content.replace('</head>', script + '\n</head>')

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated footer with page numbers in {filename}")

