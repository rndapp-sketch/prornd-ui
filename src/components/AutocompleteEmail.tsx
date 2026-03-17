import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';

interface Option {
  label: string;
  value: string;
}

interface AutocompleteEmailProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const AutocompleteEmail: React.FC<AutocompleteEmailProps> = ({
  options,
  value,
  onChange,
  placeholder = "Enter Webmail ID",
  className,
  ...rest
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [debouncedValue] = useDebounce(inputValue, 300);

  // Update internal input value if external value changes (e.g. reset/cleared)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!debouncedValue) return [];
    const searchStr = debouncedValue.toLowerCase();
    return options.filter(opt => opt.value.toLowerCase().includes(searchStr)).slice(0, 10);
  }, [debouncedValue, options]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        className={cn(className, "w-full")}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (inputValue) setIsOpen(true);
        }}
        autoComplete="off"
        {...rest}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-[9999] w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-y-auto left-0 min-w-[200px]">
          {filteredOptions.map((opt, index) => (
            <li
              key={index}
              className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-sm text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              onMouseDown={(e) => {
                // use onMouseDown instead of onClick to prevent onBlur from firing first
                e.preventDefault();
                setInputValue(opt.value);
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
