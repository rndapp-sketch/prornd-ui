# Backend API Requirements for Ado_RnD Dashboard

This document describes the backend API methods required for the Administrative Officer (Ado_RnD) Dashboard.

## Required API Endpoints

### 1. Get User Permissions

**Method:** `rndopsapp.dashboard.get_ado_rnd_permissions`

**Parameters:**
- `user` (string): Current user email

**Returns:**
```python
{
    "message": {
        "can_view_financials": bool,
        "can_approve_projects": bool,
        "can_manage_staff": bool,
        "can_view_analytics": bool,
        "can_process_payments": bool,
        "can_manage_inventory": bool,
        "can_approve_budgets": bool,
        "can_export_data": bool
    }
}
```

**Example Implementation:**
```python
# File: rndopsapp/rndopsapp/dashboard.py

import frappe
from frappe import _

@frappe.whitelist()
def get_ado_rnd_permissions(user=None):
    """
    Get granular permissions for Ado_RnD user
    """
    if not user:
        user = frappe.session.user

    # Check if user has Ado_RnD role
    if "Ado_RnD" not in frappe.get_roles(user):
        frappe.throw(_("Insufficient permissions"))

    # Get user permissions based on roles and custom permissions
    permissions = {
        "can_view_financials": has_permission(user, "view_financials"),
        "can_approve_projects": has_permission(user, "approve_projects"),
        "can_manage_staff": has_permission(user, "manage_staff"),
        "can_view_analytics": has_permission(user, "view_analytics"),
        "can_process_payments": has_permission(user, "process_payments"),
        "can_manage_inventory": has_permission(user, "manage_inventory"),
        "can_approve_budgets": has_permission(user, "approve_budgets"),
        "can_export_data": has_permission(user, "export_data")
    }

    return permissions

def has_permission(user, permission_type):
    """
    Check if user has specific permission
    Can be customized based on your permission system
    """
    # Default implementation - customize as needed
    roles = frappe.get_roles(user)

    permission_map = {
        "view_financials": ["Ado_RnD", "Hos, RnD (Head of Section, RnD)", "Dean, RnD"],
        "approve_projects": ["Ado_RnD", "Dean, RnD"],
        "manage_staff": ["Ado_RnD", "Hos, RnD (Head of Section, RnD)"],
        "view_analytics": ["Ado_RnD"],
        "process_payments": ["Ado_RnD"],
        "manage_inventory": ["Ado_RnD"],
        "approve_budgets": ["Ado_RnD", "Dean, RnD"],
        "export_data": ["Ado_RnD"]
    }

    allowed_roles = permission_map.get(permission_type, [])
    return any(role in roles for role in allowed_roles)
```

---

### 2. Get Dashboard Data

**Method:** `rndopsapp.dashboard.get_ado_rnd_dashboard_data`

**Parameters:** None (uses current user from session)

**Returns:**
```python
{
    "message": {
        "overview": {
            "total_pending_approvals": int,
            "total_processed_today": int,
            "active_projects": int,
            "pending_payments": int,
            "urgent_items": int,
            "overdue_items": int
        },
        "financials": {
            "total_budget_allocated": float,
            "total_disbursed": float,
            "pending_disbursements": float,
            "monthly_expenditure": float,
            "quarterly_expenditure": float,
            "budget_utilization_rate": float
        },
        "operations": {
            "pending_reimbursements": int,
            "pending_advances": int,
            "pending_settlements": int,
            "pending_purchases": int,
            "pending_honorariums": int,
            "avg_processing_time": float,
            "completion_rate": float
        },
        "staff_analytics": {
            "total_staff": int,
            "pending_recruitments": int,
            "pending_resignations": int,
            "pending_honorariums": int,
            "active_staff": int,
            "contractor_count": int
        },
        "recent_activities": [
            {
                "id": str,
                "type": str,
                "description": str,
                "timestamp": str,
                "user": str,
                "doctype": str
            }
        ],
        "performance_metrics": {
            "tasks_processed_today": int,
            "average_response_time": float,
            "satisfaction_score": float
        }
    }
}
```

**Example Implementation:**
```python
# File: rndopsapp/rndopsapp/dashboard.py

import frappe
from frappe import _
from frappe.utils import today, get_first_day, getdate, flt
from datetime import datetime, timedelta

@frappe.whitelist()
def get_ado_rnd_dashboard_data():
    """
    Get comprehensive dashboard data for Ado_RnD
    """
    user = frappe.session.user

    # Verify user has Ado_RnD role
    if "Ado_RnD" not in frappe.get_roles(user):
        frappe.throw(_("Insufficient permissions"))

    data = {
        "overview": get_overview_stats(),
        "financials": get_financial_stats(),
        "operations": get_operations_stats(),
        "staff_analytics": get_staff_stats(),
        "recent_activities": get_recent_activities(),
        "performance_metrics": get_performance_metrics()
    }

    return data

def get_overview_stats():
    """Get overview statistics"""
    today_date = today()

    # Count pending approvals across different doctypes
    pending_approvals = 0
    doctypes_to_check = [
        "Reimbursement",
        "Temporary Advance",
        "Advance Settlement",
        "Direct Purchase",
        "Project Staff Resignation",
        "Disbursal of Honorarium"
    ]

    for doctype in doctypes_to_check:
        count = frappe.db.count(doctype, {
            "workflow_state": ["in", ["Pending", "Under Review", "Approval Pending"]],
            "docstatus": ["<", 2]
        })
        pending_approvals += count

    # Count processed today
    processed_today = 0
    for doctype in doctypes_to_check:
        count = frappe.db.count(doctype, {
            "modified": [">=", today_date],
            "workflow_state": ["in", ["Approved", "Processed", "Completed"]],
            "docstatus": 1
        })
        processed_today += count

    # Active projects
    active_projects = frappe.db.count("Project Registration", {
        "status": ["in", ["Active", "Ongoing"]],
        "docstatus": 1
    })

    # Pending payments
    pending_payments = frappe.db.count("Payment Entry", {
        "docstatus": 0,
        "payment_type": "Pay"
    })

    return {
        "total_pending_approvals": pending_approvals,
        "total_processed_today": processed_today,
        "active_projects": active_projects,
        "pending_payments": pending_payments,
        "urgent_items": 0,  # Implement based on priority field
        "overdue_items": 0  # Implement based on due date field
    }

def get_financial_stats():
    """Get financial statistics"""
    current_year = getdate().year

    # Total budget allocated
    total_budget = frappe.db.sql("""
        SELECT SUM(total_budget_amount)
        FROM `tabProject Registration`
        WHERE docstatus = 1
        AND YEAR(start_date) = %s
    """, current_year)[0][0] or 0

    # Total disbursed
    total_disbursed = frappe.db.sql("""
        SELECT SUM(amount)
        FROM `tabFund Received`
        WHERE docstatus = 1
        AND YEAR(date_of_receipt) = %s
    """, current_year)[0][0] or 0

    # Pending disbursements
    pending_disbursements = frappe.db.sql("""
        SELECT SUM(fund_amount)
        FROM `tabFund Sanction`
        WHERE docstatus = 1
        AND status = 'Pending'
    """)[0][0] or 0

    # Monthly expenditure
    first_day_of_month = get_first_day(today())
    monthly_expenditure = frappe.db.sql("""
        SELECT SUM(amount)
        FROM `tabPayment Entry`
        WHERE docstatus = 1
        AND posting_date >= %s
        AND payment_type = 'Pay'
    """, first_day_of_month)[0][0] or 0

    # Calculate utilization rate
    budget_utilization_rate = (total_disbursed / total_budget * 100) if total_budget > 0 else 0

    return {
        "total_budget_allocated": flt(total_budget, 2),
        "total_disbursed": flt(total_disbursed, 2),
        "pending_disbursements": flt(pending_disbursements, 2),
        "monthly_expenditure": flt(monthly_expenditure, 2),
        "quarterly_expenditure": 0,  # Implement quarterly calculation
        "budget_utilization_rate": flt(budget_utilization_rate, 2)
    }

def get_operations_stats():
    """Get operational statistics"""

    pending_reimbursements = frappe.db.count("Reimbursement", {
        "workflow_state": ["in", ["Pending", "Under Review"]],
        "docstatus": ["<", 2]
    })

    pending_advances = frappe.db.count("Temporary Advance", {
        "workflow_state": ["in", ["Pending", "Under Review"]],
        "docstatus": ["<", 2]
    })

    pending_settlements = frappe.db.count("Advance Settlement", {
        "workflow_state": ["in", ["Pending", "Under Review"]],
        "docstatus": ["<", 2]
    })

    pending_purchases = frappe.db.count("Direct Purchase", {
        "workflow_state": ["in", ["Pending", "Under Review"]],
        "docstatus": ["<", 2]
    })

    pending_honorariums = frappe.db.count("Disbursal of Honorarium", {
        "workflow_state": ["in", ["Pending", "Under Review"]],
        "docstatus": ["<", 2]
    })

    return {
        "pending_reimbursements": pending_reimbursements,
        "pending_advances": pending_advances,
        "pending_settlements": pending_settlements,
        "pending_purchases": pending_purchases,
        "pending_honorariums": pending_honorariums,
        "avg_processing_time": 0,  # Implement based on creation to approval time
        "completion_rate": 0  # Implement based on completed vs total tasks
    }

def get_staff_stats():
    """Get staff analytics"""

    total_staff = frappe.db.count("Project Staff", {
        "docstatus": 1
    })

    active_staff = frappe.db.count("Project Staff", {
        "docstatus": 1,
        "status": "Active"
    })

    pending_recruitments = frappe.db.count("Recruitment Adhoc Contractual", {
        "workflow_state": ["in", ["Pending", "Under Review"]],
        "docstatus": ["<", 2]
    })

    pending_resignations = frappe.db.count("Project Staff Resignation", {
        "workflow_state": ["in", ["Pending", "Under Review"]],
        "docstatus": ["<", 2]
    })

    pending_honorariums = frappe.db.count("Disbursal of Honorarium", {
        "workflow_state": ["in", ["Pending", "Under Review"]],
        "docstatus": ["<", 2]
    })

    contractor_count = frappe.db.count("Project Staff", {
        "docstatus": 1,
        "employment_type": "Contractual"
    })

    return {
        "total_staff": total_staff,
        "pending_recruitments": pending_recruitments,
        "pending_resignations": pending_resignations,
        "pending_honorariums": pending_honorariums,
        "active_staff": active_staff,
        "contractor_count": contractor_count
    }

def get_recent_activities(limit=10):
    """Get recent activities"""
    # This is a simplified implementation
    # You may want to create a separate Activity Log doctype

    activities = []

    # Get recent document modifications
    recent_docs = frappe.db.sql("""
        SELECT
            name as id,
            'modification' as type,
            CONCAT(doctype, ' ', name, ' was modified') as description,
            modified as timestamp,
            modified_by as user,
            doctype
        FROM `tabReimbursement`
        WHERE docstatus < 2
        ORDER BY modified DESC
        LIMIT %s
    """, limit, as_dict=True)

    activities.extend(recent_docs)

    return activities

def get_performance_metrics():
    """Get performance metrics"""
    today_date = today()

    # Tasks processed today (across all doctypes)
    tasks_processed = frappe.db.sql("""
        SELECT COUNT(*) as count
        FROM (
            SELECT name FROM `tabReimbursement`
            WHERE DATE(modified) = %s
            AND workflow_state = 'Approved'
            UNION ALL
            SELECT name FROM `tabTemporary Advance`
            WHERE DATE(modified) = %s
            AND workflow_state = 'Approved'
        ) as combined
    """, (today_date, today_date))[0][0] or 0

    return {
        "tasks_processed_today": tasks_processed,
        "average_response_time": 0,  # Implement based on workflow timestamps
        "satisfaction_score": 0  # Implement if you have feedback system
    }
```

---

## Implementation Steps

### Step 1: Create the dashboard.py file
Create a new file `rndopsapp/rndopsapp/dashboard.py` and add the methods above.

### Step 2: Test the API endpoints
Use Frappe's API console or Postman to test:

```bash
# Test permissions endpoint
curl -X POST http://your-site/api/method/rndopsapp.dashboard.get_ado_rnd_permissions \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -d "user=user@example.com"

# Test dashboard data endpoint
curl -X GET http://your-site/api/method/rndopsapp.dashboard.get_ado_rnd_dashboard_data \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET"
```

### Step 3: Optimize Queries
The example implementation uses basic queries. For production:
1. Add database indexes on frequently queried fields
2. Implement caching for expensive queries
3. Use Redis for real-time statistics
4. Consider background jobs for heavy calculations

### Step 4: Security
1. Always verify user permissions
2. Sanitize inputs
3. Use parameterized queries
4. Log sensitive operations
5. Implement rate limiting

---

## Error Handling

The frontend dashboard handles errors gracefully:

1. **Permission errors**: Shows "Limited Access Mode" banner
2. **Dashboard data errors**: Shows "Dashboard Data Unavailable" banner with retry option
3. **Network errors**: Automatically retries with exponential backoff
4. **Missing data**: Falls back to zero values

Backend should return appropriate HTTP status codes:
- `200`: Success
- `403`: Insufficient permissions
- `500`: Server error

---

## Testing Checklist

- [ ] Permissions API returns correct boolean flags
- [ ] Dashboard data API returns all required fields
- [ ] Null/empty data is handled gracefully
- [ ] Large datasets don't cause timeouts
- [ ] API works with different user roles
- [ ] Error responses are properly formatted
- [ ] Performance is acceptable (< 2 seconds)

---

## Future Enhancements

1. **Real-time Updates**: Implement WebSocket for live data
2. **Caching**: Add Redis caching for frequently accessed data
3. **Analytics**: Add trending analysis and predictions
4. **Notifications**: Add alert system for urgent items
5. **Export**: Add data export functionality
6. **Audit Log**: Track all dashboard access and actions
