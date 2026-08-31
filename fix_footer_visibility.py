import os
import re

directory = "src/pages/printformat"
for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # Make .print-footer hidden on screen, visible only when printing
        content = re.sub(
            r'\.print-footer\s*{[^}]*}',
            '''.print-footer {
            display: none;
        }''',
            content,
            count=1
        )

        # Inside @media print, ensure it's shown as fixed
        old_print_footer_rule = '''.print-footer {
                position: fixed;
                bottom: 8mm;
                right: 14mm;
                left: 14mm;
            }'''
        new_print_footer_rule = '''.print-footer {
                display: block !important;
                position: fixed;
                bottom: 8mm;
                right: 14mm;
                left: 14mm;
                font-size: 8pt;
                color: #888;
                text-align: right;
                border-top: 1px solid #ddd;
                padding-top: 4px;
                z-index: 100;
            }'''

        if old_print_footer_rule in content:
            content = content.replace(old_print_footer_rule, new_print_footer_rule)
        elif '.print-footer {' not in content.split('@media print {')[-1]:
            # Add it inside @media print if not already there
            content = content.replace(
                '}  \n        ',
                '}  \n        ',
            )

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"  Fixed footer visibility in {filename}")

