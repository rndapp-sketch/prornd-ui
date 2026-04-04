import React, { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Country {
  name: { common: string };
  flags: { svg: string; png: string };
  cca2: string;
}

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const COUNTRIES_API_URL =
  "https://restcountries.com/v3.1/all?fields=name,flags,cca2";

// Module-level cache to avoid re-fetching across component instances
let cachedCountries: Country[] | null = null;

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Search country...",
}) => {
  const [countries, setCountries] = useState<Country[]>(cachedCountries || []);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(!cachedCountries);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch countries
  useEffect(() => {
    if (cachedCountries) {
      setCountries(cachedCountries);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    fetch(COUNTRIES_API_URL, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: Country[]) => {
        const sorted = data.sort((a, b) =>
          a.name.common.localeCompare(b.name.common),
        );
        cachedCountries = sorted;
        setCountries(sorted);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch countries:", err);
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Find selected country
  const selectedCountry = useMemo(
    () => countries.find((c) => c.name.common === value),
    [countries, value],
  );

  // Filtered countries based on search
  const filtered = useMemo(() => {
    if (!search) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.common.toLowerCase().includes(q) ||
        c.cca2.toLowerCase().includes(q),
    );
  }, [countries, search]);

  const handleSelect = (country: Country) => {
    onChange(country.name.common);
    setIsOpen(false);
    setSearch("");
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Display / Trigger */}
      <div
        onClick={handleInputClick}
        className={cn(
          "flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] px-3 py-2 text-sm cursor-pointer items-center gap-2 transition-all duration-200",
          "ring-offset-white dark:ring-offset-zinc-950",
          isOpen &&
            "ring-2 ring-zinc-100 dark:ring-zinc-800 border-zinc-400 dark:border-zinc-500",
          disabled &&
            "cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50 opacity-60",
          className,
        )}
      >
        {selectedCountry ? (
          <>
            <img
              src={selectedCountry.flags.svg || selectedCountry.flags.png}
              alt={selectedCountry.cca2}
              className="w-5 h-3.5 rounded-[2px] object-cover flex-shrink-0 shadow-sm"
            />
            <span className="text-zinc-900 dark:text-zinc-100 truncate flex-1">
              {selectedCountry.name.common}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500 truncate">
            {isLoading ? "Loading countries..." : placeholder}
          </span>
        )}
        <svg
          className={cn(
            "w-4 h-4 text-zinc-400 flex-shrink-0 transition-transform duration-200 ml-auto",
            isOpen && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#27272A] border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Input */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-700">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No countries found
              </div>
            ) : (
              filtered.map((country) => {
                const isSelected = value === country.name.common;
                return (
                  <button
                    key={country.cca2}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    )}
                  >
                    <img
                      src={country.flags.svg || country.flags.png}
                      alt={country.cca2}
                      className="w-6 h-4 rounded-[2px] object-cover flex-shrink-0 shadow-sm"
                      loading="lazy"
                    />
                    <span className="truncate">{country.name.common}</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto flex-shrink-0">
                      {country.cca2}
                    </span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-zinc-900 dark:text-zinc-100 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
