import os

directory = "src/pages/printformat"
for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # 1. Ensure .print-footer is OUTSIDE .page
        # Find where it is and move it.
        # But wait, different files have different placements. Let's just fix temporary_advance_format.html first to be sure!
        pass
