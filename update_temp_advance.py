import re

filepath = "src/pages/printformat/temporary_advance_format.html"
with open(filepath, "r") as f:
    html = f.read()

# 1. Update @page margin to 0 to hide browser URL/Title
html = re.sub(r'@page\s*{\s*size:\s*A4;\s*margin:\s*15mm;\s*}', r'@page {\n            size: A4;\n            margin: 0;\n        }', html)

# 2. Add layout-table CSS
css_additions = """
        table.layout-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
        }
        table.layout-table > tbody > tr > td,
        table.layout-table > tfoot > tr > td,
        table.layout-table > thead > tr > td {
            border: none;
            padding: 0;
            margin: 0;
        }
        .footer-space { height: 15mm; }
        .header-space { height: 10mm; }

        .print-footer {
            position: absolute;
            bottom: 8mm;
            right: 14mm;
            left: 14mm;
            font-size: 8pt;
            color: #888;
            text-align: right;
            border-top: 1px solid #ddd;
            padding-top: 4px;
            background-color: white;
            z-index: 100;
        }
"""
html = html.replace('</style>', css_additions + '\n    </style>')

# 3. Add print-footer CSS to @media print
media_print_add = """
            .print-footer {
                position: fixed;
                bottom: 8mm;
                right: 14mm;
                left: 14mm;
            }
"""
html = html.replace('.activity-log {\n                page-break-inside: avoid;\n            }', '.activity-log {\n                page-break-inside: avoid;\n            }' + media_print_add)

# 4. Wrap .content inside layout-table
content_start = '<div class="content">'
table_start = """<div class="content">
        <table class="layout-table">
            <thead>
                <tr>
                    <td><div class="header-space"></div></td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 0 14mm;">
"""
html = html.replace(content_start, table_start, 1)

# Find the end of .content to close the table
# The last thing inside .content is the activity table. Let's find </div>\n    </div>\n</body>
table_end = """
                    </td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td><div class="footer-space"></div></td>
                </tr>
            </tfoot>
        </table>
        
        <div class="print-footer">
            Printed on: {{CURRENT_TIME}} &nbsp;|&nbsp; IIT Guwahati — R&amp;D Section &nbsp;|&nbsp; Temporary Advance Request
        </div>
"""
# Replace the end
html = html.replace('</table>\n        </div>\n    </div>\n</body>', '</table>\n' + table_end + '        </div>\n    </div>\n</body>')

with open(filepath, "w") as f:
    f.write(html)
