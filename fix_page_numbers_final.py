import os
import re

directory = "src/pages/printformat"

for filename in os.listdir(directory):
    if not filename.endswith(".html"):
        continue
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    # Update @page to give bottom margin for native page numbers
    # Use margin-bottom: 12mm so browser can render @page margin box
    # but keep top/left/right at 0 so we control header fully
    content = re.sub(
        r'@page\s*\{\s*size:\s*A4;\s*margin:\s*0;\s*\}',
        '@page {\n            size: A4;\n            margin: 0 0 12mm 0;\n        }',
        content
    )

    # Remove the JS page-num-script entirely — not needed
    content = re.sub(
        r'\n<script id="page-num-script">.*?</script>',
        '',
        content,
        flags=re.DOTALL
    )

    # Remove body counter-reset if added
    content = re.sub(
        r'\n\n        body \{\n            counter-reset: page;\n        \}',
        '',
        content
    )

    # Replace .page-num span with CSS @page counter via @bottom-left margin box
    # Update @page to use margin boxes for page number
    content = re.sub(
        r'(@page\s*\{\s*size:\s*A4;\s*margin:\s*0 0 12mm 0;\s*\})',
        r'@page {\n            size: A4;\n            margin: 0 0 12mm 0;\n            @bottom-left {\n                content: "Page " counter(page) " of " counter(pages);\n                font-size: 8pt;\n                color: #888;\n                font-family: "Times New Roman", Times, serif;\n                padding-left: 14mm;\n            }\n        }',
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Applied native @page counter to {filename}")

