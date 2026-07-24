import React, { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Country {
    name: { common: string };
    cca2: string;
}

interface CountrySelectProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

const emojiFlag = (code: string) =>
    [...code.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");

const STATIC_COUNTRIES: Country[] = [
    { name: { common: "Afghanistan" }, cca2: "AF" },
    { name: { common: "Albania" }, cca2: "AL" },
    { name: { common: "Algeria" }, cca2: "DZ" },
    { name: { common: "Andorra" }, cca2: "AD" },
    { name: { common: "Angola" }, cca2: "AO" },
    { name: { common: "Argentina" }, cca2: "AR" },
    { name: { common: "Armenia" }, cca2: "AM" },
    { name: { common: "Australia" }, cca2: "AU" },
    { name: { common: "Austria" }, cca2: "AT" },
    { name: { common: "Azerbaijan" }, cca2: "AZ" },
    { name: { common: "Bahamas" }, cca2: "BS" },
    { name: { common: "Bahrain" }, cca2: "BH" },
    { name: { common: "Bangladesh" }, cca2: "BD" },
    { name: { common: "Barbados" }, cca2: "BB" },
    { name: { common: "Belarus" }, cca2: "BY" },
    { name: { common: "Belgium" }, cca2: "BE" },
    { name: { common: "Belize" }, cca2: "BZ" },
    { name: { common: "Benin" }, cca2: "BJ" },
    { name: { common: "Bhutan" }, cca2: "BT" },
    { name: { common: "Bolivia" }, cca2: "BO" },
    { name: { common: "Bosnia and Herzegovina" }, cca2: "BA" },
    { name: { common: "Botswana" }, cca2: "BW" },
    { name: { common: "Brazil" }, cca2: "BR" },
    { name: { common: "Brunei" }, cca2: "BN" },
    { name: { common: "Bulgaria" }, cca2: "BG" },
    { name: { common: "Burkina Faso" }, cca2: "BF" },
    { name: { common: "Burundi" }, cca2: "BI" },
    { name: { common: "Cambodia" }, cca2: "KH" },
    { name: { common: "Cameroon" }, cca2: "CM" },
    { name: { common: "Canada" }, cca2: "CA" },
    { name: { common: "Cape Verde" }, cca2: "CV" },
    { name: { common: "Central African Republic" }, cca2: "CF" },
    { name: { common: "Chad" }, cca2: "TD" },
    { name: { common: "Chile" }, cca2: "CL" },
    { name: { common: "China" }, cca2: "CN" },
    { name: { common: "Colombia" }, cca2: "CO" },
    { name: { common: "Comoros" }, cca2: "KM" },
    { name: { common: "Congo" }, cca2: "CG" },
    { name: { common: "Costa Rica" }, cca2: "CR" },
    { name: { common: "Croatia" }, cca2: "HR" },
    { name: { common: "Cuba" }, cca2: "CU" },
    { name: { common: "Cyprus" }, cca2: "CY" },
    { name: { common: "Czech Republic" }, cca2: "CZ" },
    { name: { common: "Denmark" }, cca2: "DK" },
    { name: { common: "Djibouti" }, cca2: "DJ" },
    { name: { common: "Dominica" }, cca2: "DM" },
    { name: { common: "Dominican Republic" }, cca2: "DO" },
    { name: { common: "Ecuador" }, cca2: "EC" },
    { name: { common: "Egypt" }, cca2: "EG" },
    { name: { common: "El Salvador" }, cca2: "SV" },
    { name: { common: "Equatorial Guinea" }, cca2: "GQ" },
    { name: { common: "Eritrea" }, cca2: "ER" },
    { name: { common: "Estonia" }, cca2: "EE" },
    { name: { common: "Eswatini" }, cca2: "SZ" },
    { name: { common: "Ethiopia" }, cca2: "ET" },
    { name: { common: "Fiji" }, cca2: "FJ" },
    { name: { common: "Finland" }, cca2: "FI" },
    { name: { common: "France" }, cca2: "FR" },
    { name: { common: "Gabon" }, cca2: "GA" },
    { name: { common: "Gambia" }, cca2: "GM" },
    { name: { common: "Georgia" }, cca2: "GE" },
    { name: { common: "Germany" }, cca2: "DE" },
    { name: { common: "Ghana" }, cca2: "GH" },
    { name: { common: "Greece" }, cca2: "GR" },
    { name: { common: "Grenada" }, cca2: "GD" },
    { name: { common: "Guatemala" }, cca2: "GT" },
    { name: { common: "Guinea" }, cca2: "GN" },
    { name: { common: "Guinea-Bissau" }, cca2: "GW" },
    { name: { common: "Guyana" }, cca2: "GY" },
    { name: { common: "Haiti" }, cca2: "HT" },
    { name: { common: "Honduras" }, cca2: "HN" },
    { name: { common: "Hungary" }, cca2: "HU" },
    { name: { common: "Iceland" }, cca2: "IS" },
    { name: { common: "India" }, cca2: "IN" },
    { name: { common: "Indonesia" }, cca2: "ID" },
    { name: { common: "Iran" }, cca2: "IR" },
    { name: { common: "Iraq" }, cca2: "IQ" },
    { name: { common: "Ireland" }, cca2: "IE" },
    { name: { common: "Israel" }, cca2: "IL" },
    { name: { common: "Italy" }, cca2: "IT" },
    { name: { common: "Jamaica" }, cca2: "JM" },
    { name: { common: "Japan" }, cca2: "JP" },
    { name: { common: "Jordan" }, cca2: "JO" },
    { name: { common: "Kazakhstan" }, cca2: "KZ" },
    { name: { common: "Kenya" }, cca2: "KE" },
    { name: { common: "Kiribati" }, cca2: "KI" },
    { name: { common: "Kuwait" }, cca2: "KW" },
    { name: { common: "Kyrgyzstan" }, cca2: "KG" },
    { name: { common: "Laos" }, cca2: "LA" },
    { name: { common: "Latvia" }, cca2: "LV" },
    { name: { common: "Lebanon" }, cca2: "LB" },
    { name: { common: "Lesotho" }, cca2: "LS" },
    { name: { common: "Liberia" }, cca2: "LR" },
    { name: { common: "Libya" }, cca2: "LY" },
    { name: { common: "Liechtenstein" }, cca2: "LI" },
    { name: { common: "Lithuania" }, cca2: "LT" },
    { name: { common: "Luxembourg" }, cca2: "LU" },
    { name: { common: "Madagascar" }, cca2: "MG" },
    { name: { common: "Malawi" }, cca2: "MW" },
    { name: { common: "Malaysia" }, cca2: "MY" },
    { name: { common: "Maldives" }, cca2: "MV" },
    { name: { common: "Mali" }, cca2: "ML" },
    { name: { common: "Malta" }, cca2: "MT" },
    { name: { common: "Marshall Islands" }, cca2: "MH" },
    { name: { common: "Mauritania" }, cca2: "MR" },
    { name: { common: "Mauritius" }, cca2: "MU" },
    { name: { common: "Mexico" }, cca2: "MX" },
    { name: { common: "Micronesia" }, cca2: "FM" },
    { name: { common: "Moldova" }, cca2: "MD" },
    { name: { common: "Monaco" }, cca2: "MC" },
    { name: { common: "Mongolia" }, cca2: "MN" },
    { name: { common: "Montenegro" }, cca2: "ME" },
    { name: { common: "Morocco" }, cca2: "MA" },
    { name: { common: "Mozambique" }, cca2: "MZ" },
    { name: { common: "Myanmar" }, cca2: "MM" },
    { name: { common: "Namibia" }, cca2: "NA" },
    { name: { common: "Nauru" }, cca2: "NR" },
    { name: { common: "Nepal" }, cca2: "NP" },
    { name: { common: "Netherlands" }, cca2: "NL" },
    { name: { common: "New Zealand" }, cca2: "NZ" },
    { name: { common: "Nicaragua" }, cca2: "NI" },
    { name: { common: "Niger" }, cca2: "NE" },
    { name: { common: "Nigeria" }, cca2: "NG" },
    { name: { common: "North Korea" }, cca2: "KP" },
    { name: { common: "North Macedonia" }, cca2: "MK" },
    { name: { common: "Norway" }, cca2: "NO" },
    { name: { common: "Oman" }, cca2: "OM" },
    { name: { common: "Pakistan" }, cca2: "PK" },
    { name: { common: "Palau" }, cca2: "PW" },
    { name: { common: "Palestine" }, cca2: "PS" },
    { name: { common: "Panama" }, cca2: "PA" },
    { name: { common: "Papua New Guinea" }, cca2: "PG" },
    { name: { common: "Paraguay" }, cca2: "PY" },
    { name: { common: "Peru" }, cca2: "PE" },
    { name: { common: "Philippines" }, cca2: "PH" },
    { name: { common: "Poland" }, cca2: "PL" },
    { name: { common: "Portugal" }, cca2: "PT" },
    { name: { common: "Qatar" }, cca2: "QA" },
    { name: { common: "Romania" }, cca2: "RO" },
    { name: { common: "Russia" }, cca2: "RU" },
    { name: { common: "Rwanda" }, cca2: "RW" },
    { name: { common: "Saint Kitts and Nevis" }, cca2: "KN" },
    { name: { common: "Saint Lucia" }, cca2: "LC" },
    { name: { common: "Saint Vincent and the Grenadines" }, cca2: "VC" },
    { name: { common: "Samoa" }, cca2: "WS" },
    { name: { common: "San Marino" }, cca2: "SM" },
    { name: { common: "Sao Tome and Principe" }, cca2: "ST" },
    { name: { common: "Saudi Arabia" }, cca2: "SA" },
    { name: { common: "Senegal" }, cca2: "SN" },
    { name: { common: "Serbia" }, cca2: "RS" },
    { name: { common: "Seychelles" }, cca2: "SC" },
    { name: { common: "Sierra Leone" }, cca2: "SL" },
    { name: { common: "Singapore" }, cca2: "SG" },
    { name: { common: "Slovakia" }, cca2: "SK" },
    { name: { common: "Slovenia" }, cca2: "SI" },
    { name: { common: "Solomon Islands" }, cca2: "SB" },
    { name: { common: "Somalia" }, cca2: "SO" },
    { name: { common: "South Africa" }, cca2: "ZA" },
    { name: { common: "South Korea" }, cca2: "KR" },
    { name: { common: "South Sudan" }, cca2: "SS" },
    { name: { common: "Spain" }, cca2: "ES" },
    { name: { common: "Sri Lanka" }, cca2: "LK" },
    { name: { common: "Sudan" }, cca2: "SD" },
    { name: { common: "Suriname" }, cca2: "SR" },
    { name: { common: "Sweden" }, cca2: "SE" },
    { name: { common: "Switzerland" }, cca2: "CH" },
    { name: { common: "Syria" }, cca2: "SY" },
    { name: { common: "Taiwan" }, cca2: "TW" },
    { name: { common: "Tajikistan" }, cca2: "TJ" },
    { name: { common: "Tanzania" }, cca2: "TZ" },
    { name: { common: "Thailand" }, cca2: "TH" },
    { name: { common: "Togo" }, cca2: "TG" },
    { name: { common: "Tonga" }, cca2: "TO" },
    { name: { common: "Trinidad and Tobago" }, cca2: "TT" },
    { name: { common: "Tunisia" }, cca2: "TN" },
    { name: { common: "Turkey" }, cca2: "TR" },
    { name: { common: "Turkmenistan" }, cca2: "TM" },
    { name: { common: "Tuvalu" }, cca2: "TV" },
    { name: { common: "Uganda" }, cca2: "UG" },
    { name: { common: "Ukraine" }, cca2: "UA" },
    { name: { common: "United Arab Emirates" }, cca2: "AE" },
    { name: { common: "United Kingdom" }, cca2: "GB" },
    { name: { common: "United States" }, cca2: "US" },
    { name: { common: "Uruguay" }, cca2: "UY" },
    { name: { common: "Uzbekistan" }, cca2: "UZ" },
    { name: { common: "Vanuatu" }, cca2: "VU" },
    { name: { common: "Vatican City" }, cca2: "VA" },
    { name: { common: "Venezuela" }, cca2: "VE" },
    { name: { common: "Vietnam" }, cca2: "VN" },
    { name: { common: "Yemen" }, cca2: "YE" },
    { name: { common: "Zambia" }, cca2: "ZM" },
    { name: { common: "Zimbabwe" }, cca2: "ZW" },
];

export const CountrySelect: React.FC<CountrySelectProps> = ({
    value,
    onChange,
    disabled = false,
    className,
    placeholder = "Search country...",
}) => {
    const countries = STATIC_COUNTRIES;
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const selectedCountry = useMemo(
        () => countries.find((c) => c.name.common === value),
        [countries, value],
    );

    const filtered = useMemo(() => {
        if (!search) return countries;
        const q = search.toLowerCase();
        return countries.filter(
            (c) => c.name.common.toLowerCase().includes(q) || c.cca2.toLowerCase().includes(q),
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
        <div ref={containerRef} className="relative z-30">
            {/* Display / Trigger */}
            <div
                onClick={handleInputClick}
                className={cn(
                    "flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] px-3 py-2 text-sm cursor-pointer items-center gap-2 transition-all duration-200",
                    "ring-offset-white dark:ring-offset-zinc-950",
                    isOpen && "ring-2 ring-zinc-100 dark:ring-zinc-800 border-zinc-400 dark:border-zinc-500",
                    disabled && "cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50 opacity-60",
                    className,
                )}
            >
                {selectedCountry ? (
                    <>
                        <span className="text-lg leading-none flex-shrink-0">{emojiFlag(selectedCountry.cca2)}</span>
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
                    <span className="text-zinc-400 dark:text-zinc-500 truncate">{placeholder}</span>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-[9999] mt-1 w-full bg-white dark:bg-[#27272A] border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Search Input */}
                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-700">
                        <div className="relative">
                            <svg
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                                        <span className="text-lg leading-none flex-shrink-0">{emojiFlag(country.cca2)}</span>
                                        <span className="truncate">{country.name.common}</span>
                                        {isSelected && (
                                            <svg
                                                className="w-4 h-4 text-zinc-900 dark:text-zinc-100 flex-shrink-0 ml-auto"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
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
