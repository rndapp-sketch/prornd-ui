"""
DPF diagnostic for a specific department head.

Run on the Frappe backend (NOT in this frontend repo — copy this file onto the bench host):

    bench --site prornd.local execute rndopsapp.debug_dpf_hodcivil.run --kwargs "{'user': 'hodcivil@iitg.ac.in'}"

or interactively:

    bench --site prornd.local console
    >>> from rndopsapp import debug_dpf_hodcivil
    >>> debug_dpf_hodcivil.run("hodcivil@iitg.ac.in")

Place this file wherever bench execute can import it (e.g. the app's top-level module dir),
or just paste the body into `bench console` directly.

What it checks, in order, mirroring the exact mint/scope logic in
docs/dpf-project-implementation.md sections 5.1 and 5.6:

  1. Does the user exist and what roles do they hold? (must include head_approver_1
     or one of the HoD/HoC/HoS role names for the "DPF" tab label / mint path to fire)
  2. Which Department_prornd row(s) list this user as dept_head — exact string match,
     the same equality Frappe uses server-side. Prints repr() so whitespace/case
     mismatches are visible instead of hidden by terminal trimming.
  3. For each such department: does a DPF balance exist / is it non-zero
     (probe endpoint), which is the has_fund_activity() gate that decides whether
     ensure_dpf_project ever mints a project row at all.
  4. Does a "Project Registration" row already exist for that department
     (project_no = DPF{dept_id}), and does its pi_webmail exactly equal the
     CURRENT dept_head — the doc explicitly warns this drifts when the head
     rotates and is not auto-reconciled except on ensure_dpf_project running.
  5. Sanity-check is_overhead_project / overhead_fund_type / overhead_scope_id /
     workflow_state / docstatus on that row.
  6. Whether head_approver_1 has been granted read/write/create/submit on the
     application doctypes per patchs/grant_head_application_access.py — a
     missing grant is the other documented failure mode (silent empty errors
     on Submit), separate from an invisible project row.

Nothing here writes or mutates anything. It only reads and prints.
"""

import frappe


def _p(label, value):
    print(f"{label:45s}: {value!r}")


def run(user="hodcivil@iitg.ac.in"):
    print("=" * 100)
    print(f"DPF diagnostic for {user}")
    print("=" * 100)

    # 1. Does the user exist, and what roles do they hold?
    if not frappe.db.exists("User", user):
        print(f"!! No User doc for {user!r} at all. Check for a typo or a different login id.")
        return

    roles = frappe.get_roles(user)
    _p("User exists", True)
    _p("Roles", roles)

    head_roles = {
        "head_approver_1",
        "head_department_center_school",
        "HoD (Head of Department)",
        "HoC (Head of Center)",
        "HoS (Head of School)",
    }
    has_head_role = bool(head_roles.intersection(roles))
    _p("Has a department-head role", has_head_role)
    if not has_head_role:
        print("!! No head role assigned -> frontend will label the tab 'Overhead', not 'DPF',")
        print("   and the ensure_dpf_project mint effect (gated on head_approver_1 in the UI) may")
        print("   not even fire for this login. Check User > Roles in the desk.")

    # 2. Which Department_prornd row(s) list this user as dept_head.
    print("-" * 100)
    departments = frappe.get_all(
        "Department_prornd",
        filters={"dept_head": user},
        fields=["name", "dept_id", "dept_name", "dept_head"],
    )
    _p("Department_prornd rows with dept_head == user (exact match)", len(departments))
    for d in departments:
        print(f"    {d}")

    if not departments:
        print("!! No department has dept_head set to this exact string.")
        print("   Checking for a near-miss (case/whitespace) across ALL departments:")
        all_depts = frappe.get_all(
            "Department_prornd", fields=["name", "dept_id", "dept_name", "dept_head"]
        )
        needle = user.strip().lower()
        near = [d for d in all_depts if (d.dept_head or "").strip().lower() == needle]
        if near:
            print("   !! FOUND a near-miss - dept_head differs only in case/whitespace:")
            for d in near:
                _p("     dept_head as stored", d.dept_head)
                _p("     user we are checking", user)
        else:
            print("   No near-miss either. Search manually for 'civil' in dept_name:")
            civil = [d for d in all_depts if "civil" in (d.dept_name or "").lower()]
            for d in civil:
                print(f"     {d}")
            if not civil:
                print("   !! No Department_prornd row even mentions 'civil' in dept_name.")
                print("      The Civil Engineering department record may not exist, or its")
                print("      name differs (e.g. 'CE' / abbreviation) - check dept_id/dept_name schema.")
        return

    # From here on, walk every department this user heads (normally one).
    for d in departments:
        dept_id = d["dept_id"]
        print("-" * 100)
        print(f"Department: {d['dept_name']} (dept_id={dept_id}, docname={d['name']})")

        # 3. DPF balance / activity probe.
        # This mirrors the Accounts endpoint the backend calls before minting:
        #   GET /api/credit-distributions/fund-balance/dpf/department/{dept_id}
        # We can't call that HTTP API from here without its base URL/auth, so instead
        # check whatever local cache/log this bench has of the last probe, OR call it
        # directly if requests + the Accounts base URL are available. Adjust BASE_URL below.
        try:
            import requests

            BASE_URL = frappe.conf.get("accounts_ledger_base_url") or "http://172.16.135.27:18083"
            url = f"{BASE_URL}/api/credit-distributions/fund-balance/dpf/department/{dept_id}"
            resp = requests.get(url, timeout=5)
            _p("Fund-balance probe URL", url)
            _p("Fund-balance probe status", resp.status_code)
            _p("Fund-balance probe body", resp.text[:500])
            if resp.ok:
                body = resp.json()
                credited = body.get("credited", 0)
                loaned = body.get("loaned", 0)
                balance = body.get("balance", 0)
                has_activity = (credited != 0) or (loaned != 0) or (balance != 0)
                _p("has_fund_activity() would return", has_activity)
                if not has_activity:
                    print("   !! Balance is all zero for this department -> ensure_dpf_project will")
                    print("      correctly mint NOTHING (this is by design, not a bug - see")
                    print("      docs/dpf-project-implementation.md section 5.1). Confirm with Accounts")
                    print("      whether Civil Engineering's DPF was ever credited.")
        except Exception as e:
            print(f"   (Could not reach Accounts fund-balance endpoint directly: {e})")
            print("   Adjust BASE_URL in this script, or check Accounts side manually for department "
                  f"dept_id={dept_id}.")

        # 4. Does the Project Registration row already exist?
        expected_project_no = f"DPF{dept_id}"
        pr = frappe.db.get_value(
            "Project Registration",
            {"project_no": expected_project_no},
            [
                "name",
                "pi_webmail",
                "project_type",
                "is_overhead_project",
                "overhead_fund_type",
                "overhead_scope_id",
                "workflow_state",
                "docstatus",
            ],
            as_dict=True,
        )
        _p("Expected project_no", expected_project_no)
        if not pr:
            print("   !! No Project Registration row exists with this project_no.")
            print("      Either ensure_dpf_project has never run for this department (e.g. the head")
            print("      never logged in / the mint effect never fired), or the balance was zero at")
            print("      last mint attempt. Trigger it by having the user open /projects-view once,")
            print("      or call rndopsapp.rndopsapp.overhead_fund.ensure_overhead_projects manually.")
        else:
            print(f"   Found: {pr}")
            if pr.pi_webmail != user:
                print(f"   !! MISMATCH: pi_webmail on the project is {pr.pi_webmail!r}, "
                      f"but you are checking {user!r}.")
                print("      This is the documented 'head rotated, pi_webmail not reconciled' bug")
                print("      (docs/dpf-project-implementation.md section 5.1). The OLD head still")
                print("      sees this DPF project; the new head sees nothing, because ProjectsView")
                print("      filters strictly on pi_webmail == frappe.session.user.")
                print("      Fix: frappe.db.set_value('Project Registration', pr.name, "
                      "'pi_webmail', dept_head_email) once dept_head is confirmed correct, or make")
                print("      sure ensure_dpf_project's reconcile step actually runs for this dept.")
            else:
                print("   pi_webmail matches the user being checked - OK on that axis.")

            if not pr.is_overhead_project:
                print("   !! is_overhead_project is falsy on this row - it will not be recognised")
                print("      as an overhead project anywhere in the backend routing.")
            if pr.overhead_fund_type != "DPF":
                print(f"   !! overhead_fund_type is {pr.overhead_fund_type!r}, expected 'DPF'.")
            if str(pr.overhead_scope_id) != str(dept_id):
                print(f"   !! overhead_scope_id is {pr.overhead_scope_id!r}, expected {dept_id!r}.")
            if pr.workflow_state != "Approved" or pr.docstatus != 1:
                print(f"   !! workflow_state/docstatus are {pr.workflow_state!r}/{pr.docstatus!r}, "
                      "expected 'Approved'/1 - a DPF project is supposed to be pre-approved.")

    # 6. Application-doctype permission grant (the OTHER documented failure mode -
    #    a head can see the fund but Submit silently fails with an empty error).
    print("-" * 100)
    print("Checking head_approver_1 grants on application doctypes "
          "(docs/dpf-project-implementation.md section 5.9):")
    doctypes_to_check = [
        "Reimbursement",
        "Indent General Form",
        "Disbursal of Consultancy",
        "Travel",
        "TA/DA Settlement",
        "Temporary Advance",
        "Direct Purchase",
        "Indent Cum Sanction Sheet",
    ]
    for dt in doctypes_to_check:
        perms = frappe.get_all(
            "Custom DocPerm",
            filters={"parent": dt, "role": "head_approver_1"},
            fields=["read", "write", "create", "submit"],
        )
        if not perms:
            print(f"   !! {dt:30s} - NO Custom DocPerm row for head_approver_1 at all.")
        else:
            print(f"      {dt:30s} - {perms[0]}")

    print("=" * 100)
    print("Done. The most likely single cause for 'DPF tab empty for hodcivil' is either:")
    print("  (a) no Project Registration row for their department yet (never minted), or")
    print("  (b) a stale pi_webmail from a previous department head, or")
    print("  (c) genuinely zero DPF balance credited for Civil Engineering.")
    print("Sections 4 and 3 above tell you which one it is.")
