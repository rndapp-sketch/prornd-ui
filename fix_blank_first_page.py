import os

directory = "src/pages/printformat"
for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # Add rule to allow the main layout table row to break freely across pages
        # so the browser doesn't try to push the entire document to the second page!
        override_rule = """
            table.layout-table > tbody > tr,
            table.layout-table > tbody > tr > td {
                page-break-inside: auto !important;
                break-inside: auto !important;
            }
"""
        if "table.layout-table > tbody > tr {" not in content:
            # Inject it right after @media print {
            content = content.replace(
                '@media print {',
                '@media print {' + override_rule
            )
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed blank first page issue in {filename}")
