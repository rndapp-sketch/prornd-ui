import os
import re

directory = "src/pages/printformat"
# Skip temporary_advance_format.html — already fixed manually
skip = {"temporary_advance_format.html"}

for filename in os.listdir(directory):
    if not filename.endswith(".html") or filename in skip:
        continue
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove ALL existing .print-footer blocks (screen + print)
    content = re.sub(r'\s*\.print-footer\s*{[^}]*}', '', content)

    # Add the base rule (hidden on screen) right before </style>
    base_rule = """
        .print-footer {
            display: none;
        }"""

    # Add the print rule inside @media print — before closing }
    print_rule = """            .print-footer {
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
            }
"""

    content = content.replace('</style>', base_rule + '\n    </style>', 1)

    # Insert print rule just before the closing } of @media print
    # Find the last @media print block and insert before its closing brace
    content = re.sub(
        r'(@media print \{.*?)(        \})',
        lambda m: m.group(1) + print_rule + m.group(2),
        content,
        count=1,
        flags=re.DOTALL
    )

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Fixed {filename}")

