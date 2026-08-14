import React from "react";
import { useFrappeGetDoc } from "frappe-react-sdk";

interface DoctypeField {
  fieldname: string;
  label: string;
  fieldtype: string;
}

interface DoctypeFieldsProps {
  doctypeName: string;
}

const DoctypeFields: React.FC<DoctypeFieldsProps> = ({ doctypeName }) => {
  const { data, isLoading, error } = useFrappeGetDoc(
    "DocType",
    doctypeName,
    {
      enabled: !!doctypeName,
    }
  );

  if (!doctypeName) {
    return null;
  }

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const fields = data?.fields as DoctypeField[] | undefined;

  return (
    <div>
      <h3 className="text-xl font-semibold">Fields in {doctypeName}</h3>
      <ul className="list-disc list-inside mt-2">
        {fields?.map((field) => (
          <li key={field.fieldname}>
            {field.label} ({field.fieldtype})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DoctypeFields;