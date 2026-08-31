import os
import re

files_to_update = {
    "src/pages/application/DirectPurchaseDetails.tsx": "Direct Purchase Preview",
    "src/pages/application/DisbursalOfConsultancyDetails.tsx": "Disbursal of Consultancy Preview",
    "src/pages/application/DisbursalOfHonorariumDetails.tsx": "Disbursal of Honorarium Preview",
    "src/pages/application/DisbursalOfHonorariumForm.tsx": "Disbursal of Honorarium Preview",
    "src/pages/application/P11Form.tsx": "P-11 Form Preview",
    "src/pages/application/SanctionSheetForm.tsx": "Sanction Sheet Preview",
    "src/pages/application/TopUpFellowshipDetails.tsx": "Top Up Fellowship Preview",
    "src/pages/application/TopUpFellowshipForm.tsx": "Top Up Fellowship Preview"
}

for filepath, title in files_to_update.items():
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Simple regex to add title to <P11PrintModal if it doesn't already have one
    # Note: DirectPurchaseDetails.tsx has multiple P11PrintModal calls (ICSS, DP). I'll let those be hand-patched if needed, but let's see.
    if "title=" not in content:
        content = re.sub(r'<P11PrintModal', f'<P11PrintModal\n                title="{title}"', content)
        with open(filepath, 'w') as f:
            f.write(content)
            print(f"Updated {filepath}")
