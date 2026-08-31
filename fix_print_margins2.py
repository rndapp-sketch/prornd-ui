import os
import re

directory = "src/pages/printformat"
for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # Update @page margin regardless of mm or 0 or 0mm
        content = re.sub(
            r'@page\s*{\s*size:\s*A4;\s*margin:\s*0(?:mm|px)?;\s*}',
            r'@page {\n            size: A4;\n            margin: 15mm;\n        }',
            content
        )

        # Remove print-specific padding from .content to avoid double margins
        content = re.sub(
            r'(\.content\s*{[^}]*)padding:\s*0\s+14mm\s+20mm\s+14mm;([^}]*})',
            r'\1padding: 0;\2',
            content
        )

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Verified margins in {filename}")
