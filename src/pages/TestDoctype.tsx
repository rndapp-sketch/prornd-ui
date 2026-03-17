import React, { useState } from "react";
import DoctypeFields from "../components/DoctypeFields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TestDoctype: React.FC = () => {
  const [doctypeName, setDoctypeName] = useState("");
  const [searchDoctype, setSearchDoctype] = useState("");

  const handleSearch = () => {
    setSearchDoctype(doctypeName);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Get Doctype Fields</h2>
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input
          type="text"
          placeholder="Enter Doctype Name"
          value={doctypeName}
          onChange={(e) => setDoctypeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <Button onClick={handleSearch}>Get Fields</Button>
      </div>

      <div className="mt-6">
        <DoctypeFields key={searchDoctype} doctypeName={searchDoctype} />
      </div>
    </div>
  );
};

export default TestDoctype;