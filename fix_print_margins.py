import os
import re

directory = "src/pages/printformat"
for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # Update @page margin
        content = re.sub(
            r'@page\s*{\s*size:\s*A4;\s*margin:\s*0;\s*}',
            r'@page {\n            size: A4;\n            margin: 15mm;\n        }',
            content
        )

        # Remove print-specific padding from .content to avoid double margins
        content = re.sub(
            r'(\.content\s*{[^}]*)padding:\s*10mm\s+10mm;([^}]*})',
            r'\1padding: 0;\2',
            content
        )

        # Prevent rows from breaking in half
        if 'tr {' not in content and 'page-break-inside' not in content.lower():
             pass # just appending rule if needed, but modern browsers usually handle tr well if margin is set. 
             # Actually, let's just add tr { page-break-inside: avoid; } inside @media print if it doesn't exist
        
        # Let's add a generic table rule inside @media print
        if 'tr { page-break-inside: avoid; }' not in content:
            content = content.replace(
                '@media print {',
                '@media print {\n            tr { page-break-inside: avoid; }'
            )

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated margins in {filename}")
