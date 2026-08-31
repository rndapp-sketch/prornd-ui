import os
import re

directory = "src/pages/printformat"
for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # Update @page margin to 0 to HIDE browser URL and Name headers completely.
        # Since all templates use a custom `.print-footer` or layout-table, we can safely hide the browser's default UI.
        content = re.sub(
            r'@page\s*{\s*size:\s*A4;\s*margin:\s*15mm;\s*}',
            r'@page {\n            size: A4;\n            margin: 0;\n        }',
            content
        )

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Set @page margin to 0 in {filename} to hide browser headers.")
