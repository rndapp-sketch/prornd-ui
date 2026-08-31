# Backend snippet — NOT part of the frontend build, NOT auto-deployed.
#
# WHY: DirectorDashboard.tsx / HeadOverview.tsx currently resolve each
# ongoing project's fund-received status one HTTP call at a time (see
# `syncFunds` in src/pages/dashboards/DirectorDashboard.tsx, which chunks
# 20-at-a-time calls to the existing `get_fund_received_by_prjreg` method
# below). With hundreds of ongoing projects that's dozens of round-trips,
# which is why the Ongoing Projects card's Fund Received/Pending badges can
# sit on "Loading…" for a while.
#
# WHAT: A bulk sibling of the existing method that answers for every
# requested project in a single Frappe call. Add this function into the
# SAME file that already defines `get_fund_received_by_prjreg` — i.e.
# `rndopsapp/rndopsapp/doctype/fund_received/fund_received.py` — so it's
# whitelisted at:
#   rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_status_bulk
#
# ASSUMPTION TO VERIFY: the Fund Received doctype has a field literally
# named `prjreg_title` (matching the query-param name the existing
# single-project method already uses) that links back to the Project
# Registration name. If the actual fieldname differs, swap it below.
#
# Once deployed, tell Claude (or update the frontend yourself) so the
# `syncFunds` loop in DirectorDashboard.tsx / HeadOverview.tsx can call
# this once per sync pass instead of chunking 20 requests at a time.

import frappe


@frappe.whitelist()
def get_fund_received_status_bulk(prjreg_titles=None):
    """
    Bulk version of get_fund_received_by_prjreg.

    Args:
        prjreg_titles: JSON array (or comma-separated string) of
            Project Registration names to check, e.g.
            '["PRJ-0001", "PRJ-0002"]' or "PRJ-0001,PRJ-0002".

    Returns:
        dict mapping each requested prjreg_title -> bool, True if that
        project has an Approved / "Fund Received" Fund Received record
        against it, False otherwise (including projects with no Fund
        Received record at all).
    """
    if not prjreg_titles:
        return {}

    if isinstance(prjreg_titles, str):
        try:
            prjreg_titles = frappe.parse_json(prjreg_titles)
        except Exception:
            prjreg_titles = [t.strip() for t in prjreg_titles.split(",") if t.strip()]

    prjreg_titles = list(dict.fromkeys(prjreg_titles or []))  # de-dupe, keep order
    if not prjreg_titles:
        return {}

    rows = frappe.get_all(
        "Fund Received",
        filters={"prjreg_title": ["in", prjreg_titles]},
        fields=["prjreg_title", "workflow_state"],
        limit_page_length=0,
    )

    status = {name: False for name in prjreg_titles}
    for row in rows:
        if status.get(row.prjreg_title):
            continue  # already confirmed True from an earlier row for this project
        state = (row.workflow_state or "").lower()
        if state == "approved" or "fund received" in state:
            status[row.prjreg_title] = True

    return status
