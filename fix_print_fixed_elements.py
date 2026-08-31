import os
import re

directory = "src/pages/printformat"
for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # 1. Update @media print to force watermark to be fixed
        if "@media print {" in content:
            watermark_print_css = """
            .watermark {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 0 !important;
            }
"""
            if ".watermark {" not in content.split("@media print {")[1]:
                content = content.replace('@media print {', '@media print {' + watermark_print_css)

        # 2. Move watermark OUTSIDE .page (to just before </body>)
        if '<div class="watermark">' in content:
            # Extract the watermark div
            watermark_match = re.search(r'(<div class="watermark">.*?</div>)', content, re.DOTALL)
            if watermark_match:
                watermark_html = watermark_match.group(1)
                # Remove it from its original place
                content = content.replace(watermark_html, '', 1)
                # Put it before </body>
                content = content.replace('</body>', watermark_html + '\n</body>')

        # 3. Move .print-footer OUTSIDE .page (to just before </body>)
        if '<div class="print-footer">' in content:
            footer_match = re.search(r'(<div class="print-footer">.*?</div>)', content, re.DOTALL)
            if footer_match:
                footer_html = footer_match.group(1)
                # Remove it from its original place
                content = content.replace(footer_html, '', 1)
                # Put it before </body>
                content = content.replace('</body>', footer_html + '\n</body>')

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed watermark and footer in {filename}")

