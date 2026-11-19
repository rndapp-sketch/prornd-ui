import { useEffect, useState } from "react";
import { peekDepartmentLabel, resolveDepartmentLabel } from "@/utils/resolveDepartmentLabel";

interface DepartmentNameProps {
    name: string;
}

export const DepartmentName = ({ name }: DepartmentNameProps) => {
    if (!name) return null;
    return <DepartmentNameResolver name={name} />;
};

// A department reference can be either the Frappe doc `name` or the short custom `dept_id`
// field, so the lookup tries both and falls back to the raw value (see resolveDepartmentLabel).
// Results are cached for the page's lifetime, so the same department shown in several places,
// or re-mounted when a page re-renders, costs a single request instead of one per mount.
const DepartmentNameResolver = ({ name }: { name: string }) => {
    const [label, setLabel] = useState<string | undefined>(() => peekDepartmentLabel(name));

    useEffect(() => {
        const cached = peekDepartmentLabel(name);
        if (cached !== undefined) {
            setLabel(cached);
            return;
        }
        let cancelled = false;
        setLabel(undefined);
        resolveDepartmentLabel(name).then((l) => {
            if (!cancelled) setLabel(l);
        });
        return () => {
            cancelled = true;
        };
    }, [name]);

    return <span>{label === undefined ? "…" : label}</span>;
};
