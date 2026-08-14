// src/components/ValidatedPhoneInput.tsx

import React, { useState } from 'react';
import { Input } from '@/components/ui/input'; // Assuming you use ShadCN UI

interface ValidatedPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const ValidatedPhoneInput: React.FC<ValidatedPhoneInputProps> = ({ value, onChange, className, placeholder }) => {
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow only numbers and ensure it doesn't exceed 10 digits
    const numericRegex = /^[0-9\b]{0,10}$/;

    if (numericRegex.test(inputValue)) {
      onChange(inputValue);
      // Clear error if input becomes valid (empty or 10 digits)
      if (inputValue.length === 10 || inputValue.length === 0) {
        setError(null);
      }
    }
  };

  const handleBlur = () => {
    // Show an error if the field is not empty and not 10 digits long
    if (value && value.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
    } else {
      setError(null);
    }
  };

  return (
    <div>
      <Input
        type="tel" // Use "tel" for better mobile experience
        value={value}
        onChange={handlePhoneChange}
        onBlur={handleBlur}
        maxLength={10}
        placeholder={placeholder || "Enter 10-digit mobile number"}
        className={`${className} ${error ? 'border-red-600 focus-visible:ring-red-600' : ''}`}
      />
      {error && <p className="text-red-700 text-sm mt-1 font-bold">{error}</p>}
    </div>
  );
};

export default ValidatedPhoneInput;