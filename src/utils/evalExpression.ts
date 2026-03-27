/**
 * Eval Expression Handler
 * Utility to evaluate Frappe-style conditional expressions for form fields
 */

/**
 * Evaluates a Frappe-style expression against the current form document
 * @param expression - The expression string (e.g., "doc.select_form_type=='P3'")
 * @param doc - The current form data object
 * @returns boolean - The result of the expression evaluation
 */
export const evaluateExpression = (
    expression: string | undefined | null,
    doc: Record<string, any>
): boolean => {
    if (!expression) return true;

    try {
        // Clean expression - handle various Frappe expression formats
        let cleanExpr = expression.trim();

        // Handle eval: prefix if present
        if (cleanExpr.startsWith('eval:')) {
            cleanExpr = cleanExpr.slice(5);
        }

        // Replace frappe-specific syntax
        cleanExpr = cleanExpr
            .replace(/frappe\.session\.user/g, JSON.stringify(doc._currentUser || ''))
            .replace(/in_list\s*\(\s*\[(.*?)\]\s*,\s*(.*?)\s*\)/g, '[$1].includes($2)')
            .replace(/\bor\b/g, '||')
            .replace(/\band\b/g, '&&')
            .replace(/\bnot\b/g, '!');

        // Remove trailing semicolon if present
        if (cleanExpr.endsWith(';')) {
            cleanExpr = cleanExpr.slice(0, -1);
        }

        // Create and execute the function
        const evalFn = new Function('doc', `
      try {
        return Boolean(${cleanExpr});
      } catch (e) {
        return true;
      }
    `);

        return evalFn(doc);
    } catch (error) {
        console.error('Expression evaluation error:', error, 'Expression:', expression);
        return true; // Default to showing the field on error
    }
};

/**
 * Checks if a field should be visible based on depends_on expression
 */
export const isFieldVisible = (
    field: { fieldtype?: string; depends_on?: string; hidden?: boolean | number | string },
    doc: Record<string, any>
): boolean => {
    // If explicitly marked as hidden, don't show it
    if (field.hidden === 1 || field.hidden === true || field.hidden === '1') return false;

    // Frappe fieldtype "Hidden" should never be shown
    if (field.fieldtype === 'Hidden') return false;

    // If there's no depends_on condition (and it's not hidden), show it
    if (!field.depends_on) return true;

    // Otherwise, evaluate the depends_on condition
    return evaluateExpression(field.depends_on, doc);
};

/**
 * Checks if a field is mandatory based on mandatory_depends_on expression
 */
export const isFieldMandatory = (
    field: { mandatory?: boolean | number; mandatory_depends_on?: string },
    doc: Record<string, any>
): boolean => {
    if (field.mandatory) return true;
    if (!field.mandatory_depends_on) return false;
    return evaluateExpression(field.mandatory_depends_on, doc);
};

/**
 * Checks if a field is read-only based on read_only_depends_on expression
 */
export const isFieldReadOnly = (
    field: { read_only?: boolean | number; read_only_depends_on?: string },
    doc: Record<string, any>
): boolean => {
    if (field.read_only) return true;
    if (!field.read_only_depends_on) return false;
    return evaluateExpression(field.read_only_depends_on, doc);
};
