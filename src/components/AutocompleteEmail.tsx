import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  searchByLabel?: boolean;
  /** Show all options when the field is focused (even with empty input) */
  showAllOnFocus?: boolean;
  /** Show only the label in dropdown items, without the value in parentheses */
  displayOnlyLabel?: boolean;
  /** Optional message shown at the bottom of the dropdown list */
  footerMessage?: string;
  /** Disallow free-form input — clears field on blur if no matching option was selected */
  strictMatch?: boolean;
  /** When provided, replaces local filtering with an async backend search */
  onAsyncSearch?: (query: string) => Promise<Option[]>;
  /** On selection, store/display "label (value)" instead of just the label or value */
  combineLabelValue?: boolean;
}

export const AutocompleteEmail: React.FC<AutocompleteEmailProps> = ({
  options,
  value,
  onChange,
  placeholder = "Enter Webmail ID",
  className,
  searchByLabel = false,
  showAllOnFocus = false,
  displayOnlyLabel = false,
  footerMessage,
  strictMatch = false,
  onAsyncSearch,
  combineLabelValue = false,
  ...rest
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [asyncResults, setAsyncResults] = useState<Option[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [debouncedValue] = useDebounce(inputValue, 300);

  // Update internal input value if external value changes (e.g. reset/cleared)
  useEffect(() => {
    if (combineLabelValue) {
      setInputValue(value);
    } else if (searchByLabel && value) {
      const matched = options.find(opt => opt.value === value);
      setInputValue(matched ? matched.label : value);
    } else {
      setInputValue(value);
    }
  }, [value, options, searchByLabel, combineLabelValue]);

  // Async search: fire when debounced input changes (empty = show all when showAllOnFocus)
  useEffect(() => {
    if (!onAsyncSearch) return;
    // If empty and not showing all on focus, clear results without a fetch
    if (!debouncedValue && !showAllOnFocus) {
      setAsyncResults([]);
      return;
    }
    let cancelled = false;
    setAsyncLoading(true);
    onAsyncSearch(debouncedValue).then((results) => {
      if (!cancelled) {
        setAsyncResults(results);
        setAsyncLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setAsyncLoading(false);
    });
    return () => { cancelled = true; };
  }, [debouncedValue, onAsyncSearch, showAllOnFocus]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recompute dropdown position whenever it opens or window scrolls/resizes
  useEffect(() => {
    if (!isOpen || !inputRef.current) return;

    const updatePosition = () => {
      const rect = inputRef.current!.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (onAsyncSearch) return asyncResults;
    if (!debouncedValue && !showAllOnFocus) return [];
    const searchStr = debouncedValue.toLowerCase();
    const filtered = searchStr
      ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchStr) || opt.value.toLowerCase().includes(searchStr)
      )
      : options;
    return filtered.sort((a, b) =>
      (searchByLabel ? a.label : a.value).localeCompare(searchByLabel ? b.label : b.value)
    );
  }, [debouncedValue, options, searchByLabel, showAllOnFocus, onAsyncSearch, asyncResults]);

  const showNoResults = !asyncLoading && strictMatch && isOpen && debouncedValue.length > 0 && filteredOptions.length === 0;

  const dropdown = isOpen && (asyncLoading || filteredOptions.length > 0 || footerMessage || showNoResults) ? (
    <ul
      style={dropdownStyle}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-y-auto min-w-[200px]"
    >
      {asyncLoading ? (
        <li className="px-4 py-2.5 text-sm text-zinc-400 dark:text-zinc-500 italic select-none">
          Searching…
        </li>
      ) : showNoResults ? (
        <li className="px-4 py-2.5 text-sm text-zinc-400 dark:text-zinc-500 italic select-none">
          No results found
        </li>
      ) : filteredOptions.map((opt, index) => (
        <li
          key={index}
          className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-sm text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
          onMouseDown={(e) => {
            e.preventDefault();
            const combined = `${opt.label} (${opt.value})`;
            setInputValue(combineLabelValue ? combined : (searchByLabel ? opt.label : opt.value));
            onChange(combineLabelValue ? combined : opt.value);
            setIsOpen(false);
          }}
        >
          {displayOnlyLabel
            ? opt.label
            : searchByLabel
              ? `${opt.label} (${opt.value})`
              : `${opt.value} (${opt.label})`}
        </li>
      ))}
      {footerMessage && (
        <li className="px-4 py-2 text-xs text-zinc-400 dark:text-zinc-500 italic border-t border-zinc-100 dark:border-zinc-800 select-none">
          {footerMessage}
        </li>
      )}
    </ul>
  ) : null;

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        className={cn(className, "w-full")}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
        }}
        onBlur={() => {
          if (strictMatch) {
            const matched = searchByLabel
              ? options.find(opt => opt.label.toLowerCase() === inputValue.toLowerCase())
              : options.find(opt => opt.value.toLowerCase() === inputValue.toLowerCase());
            if (!matched) {
              setInputValue('');
              onChange('');
            }
          }
          setIsOpen(false);
        }}
        autoComplete="off"
        {...rest}
      />
      {createPortal(dropdown, document.body)}
    </div>
  );
};
