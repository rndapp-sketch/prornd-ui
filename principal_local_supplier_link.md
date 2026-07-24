# Principal Supplier ↔ Local Supplier Detail — How They Are Linked

## Overview

**Principal Supplier** is the main (OEM / national-level) supplier.  
**Local Supplier Detail** is the child table that stores one or more local agents/distributors for that principal supplier.

One Principal Supplier can have **many Local Suppliers** (one-to-many relationship).

---

## 1. Doctype Relationship (Frappe Child Table)

```
Principal Supplier (Parent Doctype)
│
│  field: local_suppliers  (fieldtype: Table)
│                │
└────────────────▼
         Local Supplier Detail (Child Doctype)
         istable: true
```

In the `principal_supplier.json` definition:

```json
{
  "fieldname": "local_suppliers",
  "fieldtype": "Table",
  "label": "Local Suppliers",
  "options": "Local Supplier Detail"
}
```

This means `Local Supplier Detail` rows are **embedded inside** the Principal Supplier form as a grid/table section.

---

## 2. Database Level (MariaDB Tables)

### `tabPrincipal Supplier`

| Column                  | Type         | Description                        |
|-------------------------|--------------|------------------------------------|
| `name`                  | varchar(140) | Primary key (e.g. `t00285qqto`)    |
| `principal_supplier_name` | varchar(140) | Full name of the principal supplier |
| `addres`                | text         | Address                            |
| `item_type`             | varchar(140) | Chemicals / Glassware / etc.       |
| `agreement_no`          | varchar(140) | ARC agreement number               |
| `email`                 | varchar(140) | Principal supplier email           |
| `status`                | varchar(140) | Active / Inactive                  |

### `tabLocal Supplier Detail`

| Column               | Type         | Description                                      |
|----------------------|--------------|--------------------------------------------------|
| `name`               | varchar(140) | Primary key (e.g. `t00d6m6j47`)                  |
| `local_supplier_name`| varchar(140) | Name of the local agent/distributor              |
| `address`            | text         | Local supplier address                           |
| `email`              | varchar(140) | Local supplier email                             |
| `discount`           | varchar(140) | Discount % offered by this local supplier        |
| `parent`             | varchar(140) | **Foreign key → `tabPrincipal Supplier`.`name`** |
| `parentfield`        | varchar(140) | Always `local_suppliers`                         |
| `parenttype`         | varchar(140) | Always `Principal Supplier`                      |
| `idx`                | int(8)       | Row order within the grid                        |

---

## 3. The Link (JOIN Query)

```sql
SELECT
    ps.name              AS principal_id,
    ps.principal_supplier_name,
    ps.item_type,
    ps.agreement_no,
    ps.status,
    lsd.name             AS local_supplier_id,
    lsd.local_supplier_name,
    lsd.address,
    lsd.email,
    lsd.discount,
    lsd.idx
FROM `tabPrincipal Supplier` ps
LEFT JOIN `tabLocal Supplier Detail` lsd
       ON lsd.parent     = ps.name
      AND lsd.parenttype = 'Principal Supplier'
ORDER BY ps.name, lsd.idx;
```

The **join key** is:

```
tabLocal Supplier Detail.parent  =  tabPrincipal Supplier.name
```

---

## 4. Real Data Example

| Principal Supplier                    | Item Type | Agreement | Local Supplier                         | Discount |
|---------------------------------------|-----------|-----------|----------------------------------------|----------|
| M/s Bio-Rad Laboratories (I) Pvt. Ltd. | Chemicals | 7855     | M/s MolBioGen                          | 5 %      |
| M/s Loba Chemie Pvt. Ltd.             | Chemicals | 7858      | M/s North East Chemicals Corpn.        | 5 %      |
| M/s GeNetBio Corp                     | Chemicals | 7870      | M/s NEUPROCELL                         | 5 %      |
| M/s J-Sil Scientific Industries       | Glassware | 7874      | M/s A.P. Enterprise                    | 15 %     |
| M/s GeneX India Bioscience Pvt. Ltd.  | Chemicals | 7869      | M/s GeneX India Bioscience Pvt. Ltd.  | 7 %      |

---

## 5. How Rate Contract Uses Both

When a user fills a **Rate Contract** (sub-doctype of Indent Cum Sanction Sheet), they:

1. Pick an **Item Type** (Chemicals / Glassware / etc.)
2. Select a **Principal Supplier** → `rate_contract.principal_supplier` (Link field → `tabPrincipal Supplier`)
3. The form auto-fills `principal_address` and `agreement_no` from the principal supplier record
4. Then pick a **Local Supplier** from the child table rows → stored as plain text in `rate_contract.local_supplier`

```
Indent Cum Sanction Sheet
        │
        └──► Rate Contract
                  ├── principal_supplier  ──► tabPrincipal Supplier (name)
                  ├── principal_address   ◄── fetched from tabPrincipal Supplier.addres
                  ├── agreement_no        ◄── fetched from tabPrincipal Supplier.agreement_no
                  ├── local_supplier      ──► (Data field, local supplier name chosen from child grid)
                  ├── local_address       ◄── fetched from tabLocal Supplier Detail.address
                  └── local_email         ◄── fetched from tabLocal Supplier Detail.email
```

---

## 6. Record Counts (Current Database)

| Table                      | Rows |
|----------------------------|------|
| `tabPrincipal Supplier`    | 110  |
| `tabLocal Supplier Detail` | 901  |

Average of ~8 local suppliers per principal supplier.

---

## 7. Known Issues & Fixes

### 7.1 Column Order Mismatch During SQL Import

**Problem:** The production database (`_2b75dec646fec6d9`) stored Frappe system metadata columns
(`_user_tags`, `_comments`, `_assign`, `_liked_by`) **before** the custom fields in the table,
while the local database (`_365f2bec5fab17e5`) stores them **after**. A bare
`REPLACE INTO ... VALUES (...)` without explicit column names silently writes data into the wrong columns.

| Position | Production column order        | Local column order             |
|----------|-------------------------------|--------------------------------|
| 8–11     | `_user_tags`, `_comments`, `_assign`, `_liked_by` | custom fields (`local_supplier_name`, `address`, …) |
| 12+      | custom fields                 | `_user_tags`, `_comments`, `_assign`, `_liked_by` |

**Fix:** Always use explicit column names in `REPLACE INTO`:

```sql
-- tabPrincipal Supplier
REPLACE INTO `tabPrincipal Supplier`
  (`name`, `creation`, `modified`, `modified_by`, `owner`, `docstatus`, `idx`,
   `_user_tags`, `_comments`, `_assign`, `_liked_by`,
   `principal_supplier_name`, `addres`, `item_type`, `agreement_no`, `email`, `status`)
VALUES (...);

-- tabLocal Supplier Detail
REPLACE INTO `tabLocal Supplier Detail`
  (`name`, `creation`, `modified`, `modified_by`, `owner`, `docstatus`, `idx`,
   `_user_tags`, `_comments`, `_assign`,
   `local_supplier_name`, `address`, `email`, `discount`,
   `_liked_by`, `parent`, `parenttype`, `parentfield`)
VALUES (...);
```

The corrected import file is saved at `fixed_principal_fix.sql`.

---

### 7.2 `tabLocal Supplier Detail` Missing Column — `principal_supplier`

**Problem:** The local `tabLocal Supplier Detail` table has an extra `principal_supplier`
column (added via a local schema migration) that the production dump does not include.
Importing without explicit column names causes:

```
ERROR 1136 (21S01): Column count doesn't match value count at row 1
```

**Fix:** The explicit column list in `fixed_principal_fix.sql` omits `principal_supplier`,
which causes MariaDB to default it to `NULL` for all imported rows — the correct behaviour
since this column is not populated by the production data.

---

### 7.3 `JSONDecodeError` on Local Supplier Detail List View

**Symptom:**

```
Route: List/Local Supplier Detail/List

json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
  File "frappe/model/db_query.py", line 1179, in add_comment_count
    r._comment_count = len(json.loads(r._comments or "[]"))
```

**Root cause:** A previous bad import (column order mismatch, no explicit column names)
had stored child-table linkage values into metadata columns:

| Column      | Corrupt value stored       | Correct value |
|-------------|---------------------------|---------------|
| `_comments` | `"local_suppliers"`       | `NULL`        |
| `_user_tags`| parent doc name (e.g. `t00285qqto`) | `NULL` |
| `_assign`   | `"Principal Supplier"`    | `NULL`        |

Frappe's `add_comment_count` calls `json.loads(r._comments or "[]")`. When `_comments`
is the non-empty string `"local_suppliers"` (truthy), the `or "[]"` fallback is skipped
and `json.loads("local_suppliers")` raises `JSONDecodeError`.

**Fix applied (113 rows):**

```sql
UPDATE `tabLocal Supplier Detail`
SET _comments  = NULL,
    _user_tags = NULL,
    _assign    = NULL
WHERE (_comments  IS NOT NULL AND _comments  != '')
   OR (_user_tags IS NOT NULL AND _user_tags != '')
   OR (_assign    IS NOT NULL AND _assign    != '');
```

**Prevention:** Always import using `fixed_principal_fix.sql` (explicit column names)
so metadata columns are never overwritten with business data.
