import os
import re

directory = "src/pages/printformat"
for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # Update .content { padding: 0; } to .content { padding: 0 14mm; } inside @media print
        content = re.sub(
            r'\.content\s*{\s*padding:\s*0;\s*}',
            r'.content { padding: 0 14mm; }',
            content
        )

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Restored side padding in {filename}")
