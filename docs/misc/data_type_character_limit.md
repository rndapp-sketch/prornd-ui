# Frappe Field Types Reference

## Text Fields

| Field Type | Database Type | Character Limit | Description |
|------------|---------------|----------------:|-------------|
| **Data** | VARCHAR(140) | **140 characters** | Single-line text. Supports validation for Name, Email, Phone, URL, IBAN. |
| **Small Text** | TEXT | **65,535 characters** | Multi-line text. |
| **Text** | TEXT | **65,535 characters** | General-purpose text field. |
| **Long Text** | LONGTEXT | **4,294,967,295 characters** | Large text with virtually unlimited length. |
| **Text Editor** | LONGTEXT | **4,294,967,295 characters** | Rich text (WYSIWYG HTML editor). |
| **Markdown Editor** | LONGTEXT | **4,294,967,295 characters** | Markdown editor with preview support. |
| **Code** | LONGTEXT | **4,294,967,295 characters** | Code editor with syntax highlighting. |
| **JSON** | JSON / LONGTEXT | **4,294,967,295 characters** | JSON editor with syntax highlighting. |
| **Password** | TEXT | **65,535 characters** | Encrypted password or secret value. |
| **Read Only** | Depends | Depends on source | Display-only value. |
| **HTML** | Not Stored | N/A | Displays HTML content in the form. |

---

## Relationship Fields

| Field Type | Database Type | Character Limit | Description |
|------------|---------------|----------------:|-------------|
| **Link** | VARCHAR(140) | **140 characters** | Links to another DocType. |
| **Dynamic Link** | VARCHAR(140) | **140 characters** | Dynamic reference to another DocType. |
| **Table** | Child Table | Unlimited rows | Embeds a child DocType. |
| **Table MultiSelect** | Child Table | Unlimited selections | Multi-select child records. |

---

## Selection Fields

| Field Type | Database Type | Character Limit | Description |
|------------|---------------|----------------:|-------------|
| **Select** | VARCHAR(140) | **140 characters** | Dropdown selection. |
| **Check** | TINYINT(1) | 0 or 1 | Boolean checkbox. |
| **Rating** | INT/FLOAT | 3–10 stars | Interactive star rating. |

---

## Date & Time Fields

| Field Type | Database Type | Format | Description |
|------------|---------------|--------|-------------|
| **Date** | DATE | YYYY-MM-DD | Date picker. |
| **Datetime** | DATETIME | YYYY-MM-DD HH:MM:SS | Date and time picker. |
| **Time** | TIME | HH:MM:SS | Time picker. |
| **Duration** | BIGINT | Microseconds | Stores a duration (displayed as days/hours/minutes). |

---

## Numeric Fields

| Field Type | Database Type | Range / Precision | Description |
|------------|---------------|------------------|-------------|
| **Int** | INT | −2,147,483,648 to 2,147,483,647 | Integer values. |
| **Float** | DOUBLE | ~15–17 significant digits | Floating-point number. |
| **Currency** | DECIMAL(21,9) | 21 digits, 9 decimals | Currency amount. |
| **Percent** | FLOAT | Typically 0–100 | Percentage value. |

---

## File & Media Fields

| Field Type | Database Type | Character Limit | Description |
|------------|---------------|----------------:|-------------|
| **Attach** | VARCHAR(140) | **140 characters** | Attach any file. |
| **Attach Image** | VARCHAR(140) | **140 characters** | Upload an image. |
| **Image** | VARCHAR(140) | **140 characters** | Displays image from another Attach field. |
| **Attachment Gallery** | Virtual | N/A | Gallery of attached files. |
| **Signature** | LONGTEXT | **4,294,967,295 characters** | Digital signature (Base64 image). |
| **Barcode** | VARCHAR(140) | **140 characters** | Barcode value. |

---

## Advanced Fields

| Field Type | Database Type | Character Limit | Description |
|------------|---------------|----------------:|-------------|
| **Color** | VARCHAR | 7–9 characters | Color picker (e.g. `#FFFFFF`). |
| **Geolocation** | LONGTEXT | **4,294,967,295 characters** | Stores GeoJSON location data. |

---

## Layout Fields (No Database Storage)

| Field Type | Stored in Database | Description |
|------------|-------------------|-------------|
| **Section Break** | ❌ | Creates a new section. |
| **Column Break** | ❌ | Starts a new column. |
| **Tab Break** | ❌ | Creates a new tab. |
| **Button** | ❌ | Action button. |
| **HTML** | ❌ | Displays custom HTML. |

---

# Character Limit Summary

| Storage Type | Maximum Size |
|--------------|-------------:|
| VARCHAR(140) | 140 characters |
| TEXT | 65,535 characters |
| LONGTEXT | 4,294,967,295 characters |
| JSON | 4,294,967,295 characters |
| INT | 32-bit signed integer |
| DOUBLE | IEEE 754 Double Precision |
| DECIMAL(21,9) | 21 digits, 9 decimal places |

---

# Fields with 140 Character Limit

- Data
- Link
- Dynamic Link
- Select
- Attach
- Attach Image
- Image
- Barcode

---

# Fields with 65K Character Limit

- Small Text
- Text
- Password

---

# Fields with Unlimited / Large Storage

- Long Text
- Text Editor
- Markdown Editor
- Code
- JSON
- Geolocation
- Signature

---

# Non-Database (UI Only) Fields

- Section Break
- Column Break
- Tab Break
- Button
- HTML
- Attachment Gallery

---

# Data Field Validation Options

The **Data** field supports built-in validation through the **Options** property.

| Option | Validation |
|--------|------------|
| Name | Name validation |
| Email | Email format |
| Phone | Phone number |
| URL | Website URL |
| IBAN | International Bank Account Number |

---

# Total Available Field Types

1. Data
2. Link
3. Dynamic Link
4. Check
5. Select
6. Table
7. Table MultiSelect
8. Attach
9. Attachment Gallery
10. Attach Image
11. Image
12. Text Editor
13. Markdown Editor
14. Small Text
15. Text
16. Long Text
17. Code
18. JSON
19. HTML
20. Read Only
21. Password
22. Date
23. Datetime
24. Time
25. Duration
26. Int
27. Float
28. Currency
29. Percent
30. Color
31. Barcode
32. Rating
33. Geolocation
34. Button
35. Section Break
36. Column Break
37. Tab Break
38. Signature