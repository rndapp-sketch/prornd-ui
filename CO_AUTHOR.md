# Project Git & Contribution Guidelines

## Co-Author

Always use the following co-author line in every git commit:

```
Co-Authored-By: Okramjimmy <okramjimmy@gmail.com>
```

**Name:** Okramjimmy
**Email:** okramjimmy@gmail.com

Never use any AI tool (e.g. Claude, GitHub Copilot) as a co-author.

---

## Commit Message Format

Use the **Conventional Commits** format:

```
<type>: <short summary>

<optional body — explain the why, not the what>

Co-Authored-By: Okramjimmy <okramjimmy@gmail.com>
```

### Allowed Prefixes

| Prefix | When to use |
|--------|-------------|
| `feat:` | A new feature or capability added |
| `fix:` | A bug fix |
| `refactor:` | Code restructure with no behavior change |
| `style:` | Formatting, spacing, naming (no logic change) |
| `chore:` | Build config, dependencies, tooling |
| `docs:` | Documentation only |
| `perf:` | Performance improvement |
| `test:` | Adding or updating tests |

### Rules

- Summary line: **max 72 characters**, lowercase after the prefix, no period at the end
- Use imperative mood: "add edit button" not "added edit button"
- Body (if needed): explain **why** the change was made, not what changed
- Do not reference Claude, AI tools, or internal session context in commit messages

### Examples

```
feat: add inline sanctioned budget breakup editing for Fund Sanction pending tasks

feat: resolve applicant full name in reimbursement print preview

fix: correct budget head list to use display name instead of doc ID

fix: widen canEditFsFiles role check to cover all staff RnD variants

refactor: extract FundSanctionView into separate component
```

---

## Branch Naming

- **Active development branch:** `mythos_fable_v0.5`
- **Main / production branch:** `main`
- Feature branches (if needed): `feat/<short-description>` — e.g. `feat/sanction-budget-edit`
- Fix branches (if needed): `fix/<short-description>` — e.g. `fix/applicant-name-display`
- Use **kebab-case**, all lowercase, no spaces

---

## Push Behavior

- Always push to `mythos_fable_v0.5` unless explicitly working on another branch
- **Never force push** (`git push --force` / `git push -f`) to any branch
- **Never force push to `main`** under any circumstances
- Always confirm the target branch before pushing
- Do not push directly to `main` — open a PR instead

---

## What NOT to Include in Commits

- Never add Claude, Copilot, or any AI tool as a co-author
- Never commit `.env` files, secrets, API keys, or credentials
- Never commit build output (`dist/`, `../rndopsapp/public/frontend/`)
- Never use `--no-verify` to skip pre-commit hooks
- Never amend a commit that has already been pushed
- Do not add planning documents, analysis notes, or session summaries as committed files
- Do not commit `CO_AUTHOR.md` — it is a local reference file only

---

## Project-Specific Guidelines

- **Framework:** React + TypeScript + Vite — always type-check before committing (`yarn tsc --noEmit`)
- **Backend:** Frappe/ERPNext at `prornd.local` — API calls go through the proxy at `http://172.16.117.39:8000`
- **Build output:** goes to `../rndopsapp/public/frontend/` — never commit this directory
- **Active branch:** `mythos_omni_v0.4` — all work happens here until a release cut
- **Role strings:** when checking staff RnD roles, always match all variants:
  `["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"]`
- **Budget Head lookup:** always fetch `budget_head` field (display name), not `name` (doc ID)
- **Applicant name:** resolve via `User` doctype using `full_name` field, not `applicant_webmail`
- **Co-author:** every commit must end with `Co-Authored-By: Okramjimmy <okramjimmy@gmail.com>`
