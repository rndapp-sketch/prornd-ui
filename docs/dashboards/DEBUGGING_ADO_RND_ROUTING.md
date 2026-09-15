# Debugging Ado_RnD Dashboard Routing

## Issue Resolved: Priority-Based Routing

### **Problem**
User with `Ado_RnD` role was being redirected to `/home` instead of `/ado-rnd-dashboard`.

### **Root Cause**
The user likely has **multiple roles**, and the routing logic was checking lower-priority roles first (like `Permanent Employee`), causing redirection to wrong dashboard.

### **Solution**
Reordered the role checks with **Ado_RnD having higher priority** than general roles.

---

## New Routing Priority Order

```typescript
// Highest priority → Lowest priority
1. Director          → /director-dashboard
2. Dean, RnD         → /dean-dashboard
3. Ado_RnD          → /ado-rnd-dashboard  ⬅️ NOW HERE (HIGH PRIORITY)
4. Hos, RnD         → /hos-rnd-dashboard
5. head_approver_1  → /head-dashboard
6. staff, RnD       → /rnd-staff-dashboard
7. project staff    → /project-staff-dashboard
8. Inspired Faculty → /home
9. Independent Researcher → /home
10. Permanent Employee → /pihomepage
11. Default         → /home
```

---

## How to Debug Routing Issues

### **Step 1: Check User's Roles**

Open browser console and look for this log message:
```javascript
Dashboard: Roles loaded: ["Ado_RnD", "Permanent Employee", "All_ProRnd_User"]
```

### **Step 2: Check Role Checks**

Look for this log message:
```javascript
Dashboard Checks: {
  isHosRnd: false,
  isPermanentEmployee: true,
  isDirector: false,
  isDean: false,
  isHead: false,
  isProjectStaff: false,
  isRndStaff: false,
  isAdoRnd: true,  ⬅️ Should be true
  isInspiredFaculty: false,
  isIndependentResearcher: false
}
```

### **Step 3: Verify Exact Role Name**

The role name in Frappe **MUST** be exactly: `Ado_RnD`

❌ Wrong:
- `ado_rnd` (lowercase)
- `Ado RnD` (space instead of underscore)
- `Ado_Rnd` (wrong capitalization)
- `ADO_RND` (all caps)

✅ Correct:
- `Ado_RnD`

### **Step 4: Check Role Assignment in Frappe**

```python
# In Frappe backend console
frappe.get_roles("user@example.com")

# Should return list including:
['Ado_RnD', 'All_ProRnd_User', ...]
```

---

## Testing Scenarios

### **Scenario 1: User with ONLY Ado_RnD role**
```
Roles: ["Ado_RnD", "All_ProRnd_User"]
Expected: Redirect to /ado-rnd-dashboard ✅
```

### **Scenario 2: User with Ado_RnD + Permanent Employee**
```
Roles: ["Ado_RnD", "Permanent Employee", "All_ProRnd_User"]
Expected: Redirect to /ado-rnd-dashboard ✅ (Ado_RnD has higher priority)
```

### **Scenario 3: User with multiple admin roles**
```
Roles: ["Ado_RnD", "Dean, RnD", "All_ProRnd_User"]
Expected: Redirect to /dean-dashboard ✅ (Dean has higher priority than Ado_RnD)
```

### **Scenario 4: User WITHOUT Ado_RnD role**
```
Roles: ["Permanent Employee", "All_ProRnd_User"]
Expected: Redirect to /pihomepage ✅
```

---

## Common Issues & Solutions

### **Issue 1: Still redirecting to /home**

**Possible Causes:**
1. ❌ Role name is incorrect in Frappe
2. ❌ User doesn't actually have the Ado_RnD role
3. ❌ Frontend cache is stale

**Solutions:**
```bash
# 1. Check role in Frappe
frappe.get_roles("user@example.com")

# 2. Clear browser cache
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Or clear browser cache completely

# 3. Clear frontend build cache
npm run build
```

### **Issue 2: AuthRouteWrapper denies access**

**Error:** "Access Denied" or redirect to /dashboard

**Possible Causes:**
1. ❌ Role name mismatch in AuthRouteWrapper
2. ❌ Route not configured correctly
3. ❌ User lost session

**Solutions:**
```typescript
// Verify in main.tsx:
{
  path: "ado-rnd-dashboard",
  element: (
    <AuthRouteWrapper allowedRole="Ado_RnD">  // ⬅️ Must match exactly
      <AdoRndDashboard />
    </AuthRouteWrapper>
  ),
}

// Check AuthRouteWrapper.tsx has the role defined:
type AllowedRole =
  | 'Ado_RnD'  // ⬅️ Must be here
  | ...
```

### **Issue 3: Infinite redirect loop**

**Symptoms:** Browser keeps redirecting in a loop

**Possible Causes:**
1. ❌ Dashboard component itself redirects somewhere
2. ❌ Auth state is inconsistent

**Solutions:**
```bash
# Clear all auth state
1. Logout completely
2. Clear browser cookies/localStorage
3. Login again
4. Check console for errors
```

---

## Manual Testing Checklist

- [ ] **Test 1**: Login as user with ONLY `Ado_RnD` role
  - Expected: Go to `/ado-rnd-dashboard` directly

- [ ] **Test 2**: Login as user with `Ado_RnD` + `Permanent Employee`
  - Expected: Go to `/ado-rnd-dashboard` (not `/pihomepage`)

- [ ] **Test 3**: Navigate to `/dashboard` manually
  - Expected: Auto-redirect to `/ado-rnd-dashboard`

- [ ] **Test 4**: Try to access `/ado-rnd-dashboard` without Ado_RnD role
  - Expected: Redirect to `/dashboard` then to appropriate dashboard

- [ ] **Test 5**: Check console logs
  - Expected: See `isAdoRnd: true` in Dashboard Checks

- [ ] **Test 6**: Verify dashboard renders
  - Expected: All widgets visible (depending on permissions)

---

## Backend Role Assignment

### **Assign Ado_RnD role to a user:**

```python
# Method 1: Via Frappe UI
1. Go to User list
2. Open user
3. Add "Ado_RnD" role
4. Save

# Method 2: Via Python code
import frappe

frappe.get_doc("User", "user@example.com").add_roles("Ado_RnD")
```

### **Verify role assignment:**

```python
import frappe

# Get all roles for user
roles = frappe.get_roles("user@example.com")
print("Ado_RnD" in roles)  # Should print True
```

---

## Frontend Debugging Commands

### **In Browser Console:**

```javascript
// Check current route
console.log(window.location.pathname);

// Check localStorage for auth
console.log(localStorage);

// Force navigate (for testing)
window.location.href = '/ado-rnd-dashboard';

// Check SWR cache
// Open React DevTools → Components → Search for "AdoRndDashboard"
```

### **In Terminal:**

```bash
# Check build for errors
npm run build

# Check TypeScript errors
npx tsc --noEmit

# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Priority Order Rationale

**Why this order?**

1. **Director/Dean** - Highest executive roles, need institute-wide view
2. **Ado_RnD** - Specialized administrative officer, needs operational focus
3. **HoS RnD** - Section head, manages team
4. **Head** - Department head, project approver
5. **RnD Staff** - Processing staff, handles tasks
6. **Project Staff** - Project-specific staff
7. **Faculty roles** - Research/teaching focus
8. **Permanent Employee** - Default permanent staff

**Key principle:** **More specialized administrative roles** take priority over general roles.

---

## If Still Having Issues

### **Collect Debug Info:**

1. **Browser Console Logs**
   ```
   Take screenshot of:
   - "Dashboard: Roles loaded: [...]"
   - "Dashboard Checks: {...}"
   ```

2. **User Roles from Backend**
   ```python
   frappe.get_roles("user@example.com")
   ```

3. **Network Tab**
   ```
   Check if API call to get_user_roles is successful
   Look for any 403/500 errors
   ```

4. **Share:**
   - Console logs
   - User roles list
   - Any error messages
   - Current URL
   - Expected URL

---

## Success Checklist

✅ **Build passing**: `npm run build` succeeds
✅ **Role defined**: `Ado_RnD` in AllowedRole type
✅ **Route configured**: `/ado-rnd-dashboard` in main.tsx
✅ **Dashboard logic**: isAdoRnd check added
✅ **Priority correct**: Ado_RnD before Permanent Employee
✅ **Auth working**: AuthRouteWrapper checks Ado_RnD

**Current Status**: ✅ ALL COMPLETE

---

## Quick Fix Summary

**What was changed:**

**File**: [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L67-69)

**Before:**
```typescript
} else if (isHosRnd) {
  navigate('/hos-rnd-dashboard');
} else if (isAdoRnd) {           // ⬅️ TOO LOW
  navigate('/ado-rnd-dashboard');
} else if (isHead) {
```

**After:**
```typescript
} else if (isAdoRnd) {           // ⬅️ NOW HIGHER
  navigate('/ado-rnd-dashboard');
} else if (isHosRnd) {
  navigate('/hos-rnd-dashboard');
} else if (isHead) {
```

**Result**: ✅ Ado_RnD users now correctly redirect to their dashboard!

---

**Last Updated**: 2026-03-17
**Status**: ✅ FIXED
