import { useEffect, useRef, useCallback } from 'react';

// --- TYPE DEFINITIONS ---
type FormData = Record<string, any>;
type EventHandler = (frm: any, cdt?: string, cdn?: string) => void;
type EventRegistry = Record<string, Record<string, EventHandler>>; // { Doctype: { event: handler } }

// --- HELPERS (Mocking Frappe/ERPNext globals) ---
const flt = (v: any, decimals?: number) => {
    let val = parseFloat(v);
    if (isNaN(val)) val = 0;
    if (decimals !== undefined) {
        return parseFloat(val.toFixed(decimals));
    }
    return val;
};

const cint = (v: any) => {
    const val = parseInt(v);
    return isNaN(val) ? 0 : val;
};

// Mock jQuery-like object (minimal subset used in scripts)
const $ = {
    each: (collection: any, callback: (index: number, item: any) => void) => {
        if (Array.isArray(collection)) {
            collection.forEach((item, index) => callback(index, item));
        } else if (collection && typeof collection === 'object') {
            Object.keys(collection).forEach((key, index) => callback(index, collection[key]));
        }
    }
};

// --- HOOK ---
export const useFrappeClientScript = (
    script: string | null | undefined,
    formData: FormData,
    setFormData: React.Dispatch<React.SetStateAction<FormData>>,
    _doctype: string = 'Doctype' // Default if not specified in script
) => {
    const registryRef = useRef<EventRegistry>({});
    const prevFormDataRef = useRef<FormData>(formData);
    const isScriptLoaded = useRef(false);
    const setFormDataRef = useRef(setFormData);

    // Keep setFormData ref updated
    useEffect(() => {
        setFormDataRef.current = setFormData;
    }, [setFormData]);

    // Use a ref to access the *latest* formData inside callbacks/timeouts without closure staleness
    const currentFormDataRef = useRef<FormData>(formData);

    // Sync ref with state
    useEffect(() => {
        currentFormDataRef.current = formData;
        // Also update window.locals whenever formData changes so scripts can access it
        const currentLocals: Record<string, Record<string, any>> = {};
        Object.values(formData).forEach((value) => {
            if (Array.isArray(value)) {
                value.forEach(row => {
                    if (row.doctype && row.name) {
                        if (!currentLocals[row.doctype]) currentLocals[row.doctype] = {};
                        currentLocals[row.doctype][row.name] = row;
                    }
                });
            }
        });
        (window as any).locals = currentLocals;
    }, [formData]);

    // --- EXECUTE SCRIPT ON LOAD ---
    useEffect(() => {
        if (!script) {
            console.log('No script provided to useFrappeClientScript');
            return;
        }

        console.log('Loading client script...');

        // Reset registry for fresh script
        registryRef.current = {};
        isScriptLoaded.current = false;

        // Initialize global script context if needed
        if (!(window as any).__frappeScriptContext) {
            (window as any).__frappeScriptContext = {};
        }

        // Create frappe mock inline (captures refs, not stale state)
        const frappe = {
            ui: {
                form: {
                    on: (dt: string, events: Record<string, EventHandler>) => {
                        console.log(`Registering events for ${dt}:`, Object.keys(events));
                        if (!registryRef.current[dt]) registryRef.current[dt] = {};
                        Object.assign(registryRef.current[dt], events);
                    }
                }
            },
            model: {
                set_value: (cdt: string, cdn: string, field: string, val: any) => {
                    console.log(`frappe.model.set_value(${cdt}, ${cdn}, ${field}, ${val})`);

                    // Logic to update data
                    const applyUpdate = (data: FormData) => {
                        const newData = { ...data };
                        for (const key in newData) {
                            if (Array.isArray(newData[key])) {
                                const rowIndex = newData[key].findIndex((r: any) => r.name === cdn);
                                if (rowIndex !== -1) {
                                    const newRow = { ...newData[key][rowIndex], [field]: val };
                                    const newTable = [...newData[key]];
                                    newTable[rowIndex] = newRow;
                                    newData[key] = newTable;

                                    // Also update locals immediately
                                    if (newRow.doctype && newRow.name) {
                                        if (!(window as any).locals[newRow.doctype]) (window as any).locals[newRow.doctype] = {};
                                        (window as any).locals[newRow.doctype][newRow.name] = newRow;
                                    }

                                    console.log(`Updated row ${cdn} field ${field} = ${val}`);
                                    break;
                                }
                            }
                        }
                        return newData;
                    };

                    // Optimistic Synchronous Update
                    const newData = applyUpdate(currentFormDataRef.current);
                    currentFormDataRef.current = newData;

                    // Trigger React State Update
                    setFormDataRef.current(newData);
                }
            }
        };

        // Create a special 'locals' Proxy that always reads from window.locals
        const localsProxy = new Proxy({} as Record<string, Record<string, any>>, {
            get: (_target, prop: string) => {
                return (window as any).locals?.[prop] || {};
            },
            set: (_target, prop: string, value) => {
                if (!(window as any).locals) (window as any).locals = {};
                (window as any).locals[prop] = value;
                return true;
            }
        });

        // --- ATTACH GLOBALS ---
        // Mimic Frappe environment by exposing helpers to window
        const globals = {
            frappe,
            flt,
            cint,
            $: $,
            locals: localsProxy
        };
        Object.assign(window, globals);

        try {
            // We wrap the script to lift function definitions to the global context
            // This is a bit hacky but necessary because 'new Function' creates a separate scope
            const wrappedScript = `
                // Bind helpers to window context
                const windowContext = window.__frappeScriptContext;
                
                // Execute the original script
                ${script}

                // Explicitly expose functions to window if defined
                if (typeof calculate_deposit_slip === 'function') {
                    window.calculate_deposit_slip = calculate_deposit_slip;
                    windowContext.calculate_deposit_slip = calculate_deposit_slip;
                }
                if (typeof distribute_pool_share === 'function') {
                    window.distribute_pool_share = distribute_pool_share;
                    windowContext.distribute_pool_share = distribute_pool_share;
                }
                if (typeof update_row_amount === 'function') {
                    window.update_row_amount = update_row_amount;
                    windowContext.update_row_amount = update_row_amount;
                }
            `;

            // Create the Function that registers the handlers
            // We still pass arguments to 'new Function' for immediate scope access
            const func = new Function('frappe', 'flt', 'cint', '$', 'locals', 'window', wrappedScript);

            // Execute registration
            func(frappe, flt, cint, $, localsProxy, window);

            console.log('Client Script Registered. Registry:', registryRef.current);
            console.log('Events registered:', Object.keys(registryRef.current).map(dt => ({ doctype: dt, events: Object.keys(registryRef.current[dt] || {}) })));
            isScriptLoaded.current = true;
        } catch (e) {
            console.error('Error parsing client script:', e);
        }

        // Cleanup globals on unmount/change
        return () => {
            // Optional: Cleanup
        };
    }, [script]); // Only depend on script


    // --- FORM OBJECT PROXY (The 'frm' object passed to scripts) ---
    const createFrm = useCallback(() => ({
        get doc() {
            return { ...currentFormDataRef.current };
        },
        is_new: () => true,
        set_value: (fieldOrObj: string | Record<string, any>, value?: any) => {
            return new Promise<void>((resolve) => {
                const updates = typeof fieldOrObj === 'string'
                    ? { [fieldOrObj]: value }
                    : { ...fieldOrObj };

                console.log('frm.set_value called with:', updates);

                // Optimistically update ref IMMEDIATELY
                const newData = { ...currentFormDataRef.current, ...updates };
                currentFormDataRef.current = newData;

                // Trigger React State Update
                setFormDataRef.current(newData);

                resolve();
            });
        },
        refresh_field: (_fieldname: string) => { /* No-op in React */ }
    }), []);


    // --- EVENT TRIGGER (Exposed) ---
    const triggerEvent = useCallback((event: string, ...args: any[]) => {
        // Try to find handlers for this event across all registered doctypes
        let activeHandlers: Record<string, EventHandler> | null = null;
        let foundDoctype = '';

        for (const dt of Object.keys(registryRef.current)) {
            if (registryRef.current[dt]?.[event]) {
                activeHandlers = registryRef.current[dt];
                foundDoctype = dt;
                break;
            }
        }

        if (activeHandlers && activeHandlers[event]) {
            console.log(`Triggering event: ${event} (from ${foundDoctype})`, args);

            const frm = createFrm();
            try {
                activeHandlers[event](frm, ...args);
            } catch (e) {
                console.error(`Error executing client script event ${event}:`, e);
            }
        } else {
            console.log(`No handler found for event: ${event}. Registry keys:`, Object.keys(registryRef.current));
        }
    }, [createFrm]);


    // --- AUTOMATIC CHANGE DETECTION ---
    useEffect(() => {
        if (!isScriptLoaded.current) {
            console.log('useFrappeClientScript: Script not loaded yet, skipping change detection');
            return;
        }

        const prev = prevFormDataRef.current;
        const current = formData;

        // Find changed keys
        const allKeys = new Set([...Object.keys(prev), ...Object.keys(current)]);
        allKeys.forEach(key => {
            const prevVal = prev[key];
            const currentVal = current[key];

            if (JSON.stringify(prevVal) !== JSON.stringify(currentVal)) {
                console.log(`useFrappeClientScript: Field '${key}' changed. prev:`, prevVal, 'current:', currentVal);
                // 1. Trigger generic field change
                triggerEvent(key);

                // 2. Check for Child Table events (add/remove)
                if (Array.isArray(prevVal) && Array.isArray(currentVal)) {
                    if (currentVal.length > prevVal.length) {
                        console.log(`Child table add detected: ${key}`);
                        triggerEvent(`${key}_add`);
                    } else if (currentVal.length < prevVal.length) {
                        console.log(`Child table remove detected: ${key}`);
                        triggerEvent(`${key}_remove`);
                    }

                    // 3. Check for specific row field changes
                    currentVal.forEach((row, index) => {
                        const prevRow = prevVal[index];
                        if (!prevRow) return;

                        Object.keys(row).forEach(rowField => {
                            if (row[rowField] !== prevRow[rowField]) {
                                if (row.doctype && row.name) {
                                    triggerEvent(rowField, row.doctype, row.name);
                                }
                            }
                        });
                    });
                }
            }
        });

        prevFormDataRef.current = current;
    }, [formData, triggerEvent]);

    return { triggerEvent };
};
