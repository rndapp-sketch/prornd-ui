import os
import re

directory = "src/pages/printformat"

for filename in os.listdir(directory):
    if not filename.endswith(".html"):
        continue
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Remove @bottom-left block from @page, revert margin to 0
    content = re.sub(
        r'@page\s*\{[^}]*@bottom-left\s*\{[^}]*\}[^}]*\}',
        '@page {\n            size: A4;\n            margin: 0;\n        }',
        content,
        flags=re.DOTALL
    )

    # 2. Remove body counter-reset if present
    content = re.sub(r'\s*body\s*\{\s*counter-reset:\s*page(-counter)?;\s*\}', '', content)

    # 3. Remove the footer-left "Page X" span, keep only footer-right text
    content = re.sub(
        r'<span class="footer-left">Page\s*<span class="page-num">\s*</span>\s*</span>\s*',
        '',
        content
    )

    # 4. Replace footer-right span with plain text inside print-footer div
    content = re.sub(
        r'<span class="footer-right">(.*?)</span>',
        r'\1',
        content,
        flags=re.DOTALL
    )

    # 5. Remove any leftover page-num-script
    content = re.sub(
        r'\n<script id="page-num-script">.*?</script>\n',
        '\n',
        content,
        flags=re.DOTALL
    )

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Cleaned page number from {filename}")

