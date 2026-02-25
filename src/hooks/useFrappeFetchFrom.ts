import { useEffect, useRef } from "react";

interface Field {
  fieldname: string;
  fieldtype: string;
  options?: string | null;
  fetch_from?: string;
  [key: string]: any;
}

interface FormData {
  [key: string]: any;
}

/**
 * Hook to handle `fetch_from` logic in Frappe forms.
 * Automatically fetches linked document fields when the source link field changes.
 *
 * Example:
 * field "principal_investigator" has fetch_from="project_title.pi_userid".
 * When "project_title" changes, this hook fetches the project doc and sets "principal_investigator".
 */
export const useFrappeFetchFrom = (
  formData: FormData,
  setFormData: React.Dispatch<React.SetStateAction<FormData>>,
  fields: Field[],
) => {
  // Refs to track previous values and avoid duplicate fetches
  // Initialize with empty object so the first render always detects "new" values
  const prevFormDataRef = useRef<FormData>({});
  const fetchingRef = useRef<Set<string>>(new Set());
  const initialFetchDoneRef = useRef<Set<string>>(new Set());
  const prevFieldsRef = useRef<Field[]>(fields);

  // Reset initial fetch tracking when fields change (e.g., deposit slip type changed)
  useEffect(() => {
    if (prevFieldsRef.current !== fields) {
      initialFetchDoneRef.current.clear();
      prevFieldsRef.current = fields;
    }
  }, [fields]);

  useEffect(() => {
    // 1. Identify all fields that have `fetch_from`
    const fetchFields = fields.filter(
      (f) => f.fetch_from && f.fetch_from.includes("."),
    );

    fetchFields.forEach((targetField) => {
      const [sourceFieldName, sourceProperty] = (
        targetField.fetch_from || ""
      ).split(".");

      if (!sourceFieldName || !sourceProperty) return;

      // 2. Check if source field has changed OR if it has a value on initial load and target is empty
      const currentSourceValue = formData[sourceFieldName];
      const prevSourceValue = prevFormDataRef.current[sourceFieldName];
      const targetValue = formData[targetField.fieldname];

      // Also trigger if source has a value but target is still empty (initial load case)
      const isInitialFetchNeeded =
        currentSourceValue &&
        !targetValue &&
        !initialFetchDoneRef.current.has(
          `${targetField.fieldname}:${currentSourceValue}`,
        );

      // Skip fetch if source changed from undefined (initial load) but target already has a value
      const isInitialSourceSet = !prevSourceValue && currentSourceValue;
      if (isInitialSourceSet && targetValue) {
        // Target was pre-filled (e.g., by auto-fill), don't overwrite with fetch_from
        initialFetchDoneRef.current.add(
          `${targetField.fieldname}:${currentSourceValue}`,
        );
        return;
      }

      if (
        currentSourceValue &&
        (currentSourceValue !== prevSourceValue || isInitialFetchNeeded)
      ) {
        // Avoid re-fetching if already in progress for this specific signature
        const fetchSignature = `${targetField.fieldname}:${currentSourceValue}`;
        if (fetchingRef.current.has(fetchSignature)) return;

        // 3. Find the source field definition to get the Doctype (options)
        const sourceFieldDef = fields.find(
          (f) => f.fieldname === sourceFieldName,
        );
        const doctype = sourceFieldDef?.options;

        if (doctype) {
          console.log(
            `useFrappeFetchFrom: Fetching ${sourceProperty} from ${doctype} (${currentSourceValue}) for ${targetField.fieldname}`,
          );

          fetchingRef.current.add(fetchSignature);
          initialFetchDoneRef.current.add(
            `${targetField.fieldname}:${currentSourceValue}`,
          );

          // 4. Fetch the linked document values using Frappe API
          // We use the generic generic get_value or get_doc call
          fetch(`/api/method/frappe.client.get_value`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              doctype: doctype,
              filters: { name: currentSourceValue },
              fieldname: [sourceProperty],
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.message) {
                const fetchedValue = data.message[sourceProperty];
                console.log(
                  `useFrappeFetchFrom: Fetched value ${fetchedValue} for ${targetField.fieldname}`,
                );

                setFormData((prev) => ({
                  ...prev,
                  [targetField.fieldname]: fetchedValue,
                }));
              }
            })
            .catch((err) => {
              console.error(
                "useFrappeFetchFrom: Error fetching linked data",
                err,
              );
            })
            .finally(() => {
              fetchingRef.current.delete(fetchSignature);
            });
        } else {
          console.warn(
            `useFrappeFetchFrom: Could not find Doctype for source field ${sourceFieldName}`,
          );
        }
      } else if (!currentSourceValue && prevSourceValue) {
        // Source cleared -> Clear target
        setFormData((prev) => ({
          ...prev,
          [targetField.fieldname]: "",
        }));
      }
    });

    // Update ref for next render
    prevFormDataRef.current = formData;
  }, [formData, fields, setFormData]);
};
