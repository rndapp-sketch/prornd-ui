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

const flag = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

const STATIC_COUNTRIES: Country[] = [
    { name: { common: "Afghanistan" }, cca2: "AF", flags: { svg: flag("AF"), png: flag("AF") } },
    { name: { common: "Albania" }, cca2: "AL", flags: { svg: flag("AL"), png: flag("AL") } },
    { name: { common: "Algeria" }, cca2: "DZ", flags: { svg: flag("DZ"), png: flag("DZ") } },
    { name: { common: "Andorra" }, cca2: "AD", flags: { svg: flag("AD"), png: flag("AD") } },
    { name: { common: "Angola" }, cca2: "AO", flags: { svg: flag("AO"), png: flag("AO") } },
    { name: { common: "Argentina" }, cca2: "AR", flags: { svg: flag("AR"), png: flag("AR") } },
    { name: { common: "Armenia" }, cca2: "AM", flags: { svg: flag("AM"), png: flag("AM") } },
    { name: { common: "Australia" }, cca2: "AU", flags: { svg: flag("AU"), png: flag("AU") } },
    { name: { common: "Austria" }, cca2: "AT", flags: { svg: flag("AT"), png: flag("AT") } },
    { name: { common: "Azerbaijan" }, cca2: "AZ", flags: { svg: flag("AZ"), png: flag("AZ") } },
    { name: { common: "Bahamas" }, cca2: "BS", flags: { svg: flag("BS"), png: flag("BS") } },
    { name: { common: "Bahrain" }, cca2: "BH", flags: { svg: flag("BH"), png: flag("BH") } },
    { name: { common: "Bangladesh" }, cca2: "BD", flags: { svg: flag("BD"), png: flag("BD") } },
    { name: { common: "Barbados" }, cca2: "BB", flags: { svg: flag("BB"), png: flag("BB") } },
    { name: { common: "Belarus" }, cca2: "BY", flags: { svg: flag("BY"), png: flag("BY") } },
    { name: { common: "Belgium" }, cca2: "BE", flags: { svg: flag("BE"), png: flag("BE") } },
    { name: { common: "Belize" }, cca2: "BZ", flags: { svg: flag("BZ"), png: flag("BZ") } },
    { name: { common: "Benin" }, cca2: "BJ", flags: { svg: flag("BJ"), png: flag("BJ") } },
    { name: { common: "Bhutan" }, cca2: "BT", flags: { svg: flag("BT"), png: flag("BT") } },
    { name: { common: "Bolivia" }, cca2: "BO", flags: { svg: flag("BO"), png: flag("BO") } },
    { name: { common: "Bosnia and Herzegovina" }, cca2: "BA", flags: { svg: flag("BA"), png: flag("BA") } },
    { name: { common: "Botswana" }, cca2: "BW", flags: { svg: flag("BW"), png: flag("BW") } },
    { name: { common: "Brazil" }, cca2: "BR", flags: { svg: flag("BR"), png: flag("BR") } },
    { name: { common: "Brunei" }, cca2: "BN", flags: { svg: flag("BN"), png: flag("BN") } },
    { name: { common: "Bulgaria" }, cca2: "BG", flags: { svg: flag("BG"), png: flag("BG") } },
    { name: { common: "Burkina Faso" }, cca2: "BF", flags: { svg: flag("BF"), png: flag("BF") } },
    { name: { common: "Burundi" }, cca2: "BI", flags: { svg: flag("BI"), png: flag("BI") } },
    { name: { common: "Cambodia" }, cca2: "KH", flags: { svg: flag("KH"), png: flag("KH") } },
    { name: { common: "Cameroon" }, cca2: "CM", flags: { svg: flag("CM"), png: flag("CM") } },
    { name: { common: "Canada" }, cca2: "CA", flags: { svg: flag("CA"), png: flag("CA") } },
    { name: { common: "Cape Verde" }, cca2: "CV", flags: { svg: flag("CV"), png: flag("CV") } },
    { name: { common: "Central African Republic" }, cca2: "CF", flags: { svg: flag("CF"), png: flag("CF") } },
    { name: { common: "Chad" }, cca2: "TD", flags: { svg: flag("TD"), png: flag("TD") } },
    { name: { common: "Chile" }, cca2: "CL", flags: { svg: flag("CL"), png: flag("CL") } },
    { name: { common: "China" }, cca2: "CN", flags: { svg: flag("CN"), png: flag("CN") } },
    { name: { common: "Colombia" }, cca2: "CO", flags: { svg: flag("CO"), png: flag("CO") } },
    { name: { common: "Comoros" }, cca2: "KM", flags: { svg: flag("KM"), png: flag("KM") } },
    { name: { common: "Congo" }, cca2: "CG", flags: { svg: flag("CG"), png: flag("CG") } },
    { name: { common: "Costa Rica" }, cca2: "CR", flags: { svg: flag("CR"), png: flag("CR") } },
    { name: { common: "Croatia" }, cca2: "HR", flags: { svg: flag("HR"), png: flag("HR") } },
    { name: { common: "Cuba" }, cca2: "CU", flags: { svg: flag("CU"), png: flag("CU") } },
    { name: { common: "Cyprus" }, cca2: "CY", flags: { svg: flag("CY"), png: flag("CY") } },
    { name: { common: "Czech Republic" }, cca2: "CZ", flags: { svg: flag("CZ"), png: flag("CZ") } },
    { name: { common: "Denmark" }, cca2: "DK", flags: { svg: flag("DK"), png: flag("DK") } },
    { name: { common: "Djibouti" }, cca2: "DJ", flags: { svg: flag("DJ"), png: flag("DJ") } },
    { name: { common: "Dominica" }, cca2: "DM", flags: { svg: flag("DM"), png: flag("DM") } },
    { name: { common: "Dominican Republic" }, cca2: "DO", flags: { svg: flag("DO"), png: flag("DO") } },
    { name: { common: "Ecuador" }, cca2: "EC", flags: { svg: flag("EC"), png: flag("EC") } },
    { name: { common: "Egypt" }, cca2: "EG", flags: { svg: flag("EG"), png: flag("EG") } },
    { name: { common: "El Salvador" }, cca2: "SV", flags: { svg: flag("SV"), png: flag("SV") } },
    { name: { common: "Equatorial Guinea" }, cca2: "GQ", flags: { svg: flag("GQ"), png: flag("GQ") } },
    { name: { common: "Eritrea" }, cca2: "ER", flags: { svg: flag("ER"), png: flag("ER") } },
    { name: { common: "Estonia" }, cca2: "EE", flags: { svg: flag("EE"), png: flag("EE") } },
    { name: { common: "Eswatini" }, cca2: "SZ", flags: { svg: flag("SZ"), png: flag("SZ") } },
    { name: { common: "Ethiopia" }, cca2: "ET", flags: { svg: flag("ET"), png: flag("ET") } },
    { name: { common: "Fiji" }, cca2: "FJ", flags: { svg: flag("FJ"), png: flag("FJ") } },
    { name: { common: "Finland" }, cca2: "FI", flags: { svg: flag("FI"), png: flag("FI") } },
    { name: { common: "France" }, cca2: "FR", flags: { svg: flag("FR"), png: flag("FR") } },
    { name: { common: "Gabon" }, cca2: "GA", flags: { svg: flag("GA"), png: flag("GA") } },
    { name: { common: "Gambia" }, cca2: "GM", flags: { svg: flag("GM"), png: flag("GM") } },
    { name: { common: "Georgia" }, cca2: "GE", flags: { svg: flag("GE"), png: flag("GE") } },
    { name: { common: "Germany" }, cca2: "DE", flags: { svg: flag("DE"), png: flag("DE") } },
    { name: { common: "Ghana" }, cca2: "GH", flags: { svg: flag("GH"), png: flag("GH") } },
    { name: { common: "Greece" }, cca2: "GR", flags: { svg: flag("GR"), png: flag("GR") } },
    { name: { common: "Grenada" }, cca2: "GD", flags: { svg: flag("GD"), png: flag("GD") } },
    { name: { common: "Guatemala" }, cca2: "GT", flags: { svg: flag("GT"), png: flag("GT") } },
    { name: { common: "Guinea" }, cca2: "GN", flags: { svg: flag("GN"), png: flag("GN") } },
    { name: { common: "Guinea-Bissau" }, cca2: "GW", flags: { svg: flag("GW"), png: flag("GW") } },
    { name: { common: "Guyana" }, cca2: "GY", flags: { svg: flag("GY"), png: flag("GY") } },
    { name: { common: "Haiti" }, cca2: "HT", flags: { svg: flag("HT"), png: flag("HT") } },
    { name: { common: "Honduras" }, cca2: "HN", flags: { svg: flag("HN"), png: flag("HN") } },
    { name: { common: "Hungary" }, cca2: "HU", flags: { svg: flag("HU"), png: flag("HU") } },
    { name: { common: "Iceland" }, cca2: "IS", flags: { svg: flag("IS"), png: flag("IS") } },
    { name: { common: "India" }, cca2: "IN", flags: { svg: flag("IN"), png: flag("IN") } },
    { name: { common: "Indonesia" }, cca2: "ID", flags: { svg: flag("ID"), png: flag("ID") } },
    { name: { common: "Iran" }, cca2: "IR", flags: { svg: flag("IR"), png: flag("IR") } },
    { name: { common: "Iraq" }, cca2: "IQ", flags: { svg: flag("IQ"), png: flag("IQ") } },
    { name: { common: "Ireland" }, cca2: "IE", flags: { svg: flag("IE"), png: flag("IE") } },
    { name: { common: "Israel" }, cca2: "IL", flags: { svg: flag("IL"), png: flag("IL") } },
    { name: { common: "Italy" }, cca2: "IT", flags: { svg: flag("IT"), png: flag("IT") } },
    { name: { common: "Jamaica" }, cca2: "JM", flags: { svg: flag("JM"), png: flag("JM") } },
    { name: { common: "Japan" }, cca2: "JP", flags: { svg: flag("JP"), png: flag("JP") } },
    { name: { common: "Jordan" }, cca2: "JO", flags: { svg: flag("JO"), png: flag("JO") } },
    { name: { common: "Kazakhstan" }, cca2: "KZ", flags: { svg: flag("KZ"), png: flag("KZ") } },
    { name: { common: "Kenya" }, cca2: "KE", flags: { svg: flag("KE"), png: flag("KE") } },
    { name: { common: "Kiribati" }, cca2: "KI", flags: { svg: flag("KI"), png: flag("KI") } },
    { name: { common: "Kuwait" }, cca2: "KW", flags: { svg: flag("KW"), png: flag("KW") } },
    { name: { common: "Kyrgyzstan" }, cca2: "KG", flags: { svg: flag("KG"), png: flag("KG") } },
    { name: { common: "Laos" }, cca2: "LA", flags: { svg: flag("LA"), png: flag("LA") } },
    { name: { common: "Latvia" }, cca2: "LV", flags: { svg: flag("LV"), png: flag("LV") } },
    { name: { common: "Lebanon" }, cca2: "LB", flags: { svg: flag("LB"), png: flag("LB") } },
    { name: { common: "Lesotho" }, cca2: "LS", flags: { svg: flag("LS"), png: flag("LS") } },
    { name: { common: "Liberia" }, cca2: "LR", flags: { svg: flag("LR"), png: flag("LR") } },
    { name: { common: "Libya" }, cca2: "LY", flags: { svg: flag("LY"), png: flag("LY") } },
    { name: { common: "Liechtenstein" }, cca2: "LI", flags: { svg: flag("LI"), png: flag("LI") } },
    { name: { common: "Lithuania" }, cca2: "LT", flags: { svg: flag("LT"), png: flag("LT") } },
    { name: { common: "Luxembourg" }, cca2: "LU", flags: { svg: flag("LU"), png: flag("LU") } },
    { name: { common: "Madagascar" }, cca2: "MG", flags: { svg: flag("MG"), png: flag("MG") } },
    { name: { common: "Malawi" }, cca2: "MW", flags: { svg: flag("MW"), png: flag("MW") } },
    { name: { common: "Malaysia" }, cca2: "MY", flags: { svg: flag("MY"), png: flag("MY") } },
    { name: { common: "Maldives" }, cca2: "MV", flags: { svg: flag("MV"), png: flag("MV") } },
    { name: { common: "Mali" }, cca2: "ML", flags: { svg: flag("ML"), png: flag("ML") } },
    { name: { common: "Malta" }, cca2: "MT", flags: { svg: flag("MT"), png: flag("MT") } },
    { name: { common: "Marshall Islands" }, cca2: "MH", flags: { svg: flag("MH"), png: flag("MH") } },
    { name: { common: "Mauritania" }, cca2: "MR", flags: { svg: flag("MR"), png: flag("MR") } },
    { name: { common: "Mauritius" }, cca2: "MU", flags: { svg: flag("MU"), png: flag("MU") } },
    { name: { common: "Mexico" }, cca2: "MX", flags: { svg: flag("MX"), png: flag("MX") } },
    { name: { common: "Micronesia" }, cca2: "FM", flags: { svg: flag("FM"), png: flag("FM") } },
    { name: { common: "Moldova" }, cca2: "MD", flags: { svg: flag("MD"), png: flag("MD") } },
    { name: { common: "Monaco" }, cca2: "MC", flags: { svg: flag("MC"), png: flag("MC") } },
    { name: { common: "Mongolia" }, cca2: "MN", flags: { svg: flag("MN"), png: flag("MN") } },
    { name: { common: "Montenegro" }, cca2: "ME", flags: { svg: flag("ME"), png: flag("ME") } },
    { name: { common: "Morocco" }, cca2: "MA", flags: { svg: flag("MA"), png: flag("MA") } },
    { name: { common: "Mozambique" }, cca2: "MZ", flags: { svg: flag("MZ"), png: flag("MZ") } },
    { name: { common: "Myanmar" }, cca2: "MM", flags: { svg: flag("MM"), png: flag("MM") } },
    { name: { common: "Namibia" }, cca2: "NA", flags: { svg: flag("NA"), png: flag("NA") } },
    { name: { common: "Nauru" }, cca2: "NR", flags: { svg: flag("NR"), png: flag("NR") } },
    { name: { common: "Nepal" }, cca2: "NP", flags: { svg: flag("NP"), png: flag("NP") } },
    { name: { common: "Netherlands" }, cca2: "NL", flags: { svg: flag("NL"), png: flag("NL") } },
    { name: { common: "New Zealand" }, cca2: "NZ", flags: { svg: flag("NZ"), png: flag("NZ") } },
    { name: { common: "Nicaragua" }, cca2: "NI", flags: { svg: flag("NI"), png: flag("NI") } },
    { name: { common: "Niger" }, cca2: "NE", flags: { svg: flag("NE"), png: flag("NE") } },
    { name: { common: "Nigeria" }, cca2: "NG", flags: { svg: flag("NG"), png: flag("NG") } },
    { name: { common: "North Korea" }, cca2: "KP", flags: { svg: flag("KP"), png: flag("KP") } },
    { name: { common: "North Macedonia" }, cca2: "MK", flags: { svg: flag("MK"), png: flag("MK") } },
    { name: { common: "Norway" }, cca2: "NO", flags: { svg: flag("NO"), png: flag("NO") } },
    { name: { common: "Oman" }, cca2: "OM", flags: { svg: flag("OM"), png: flag("OM") } },
    { name: { common: "Pakistan" }, cca2: "PK", flags: { svg: flag("PK"), png: flag("PK") } },
    { name: { common: "Palau" }, cca2: "PW", flags: { svg: flag("PW"), png: flag("PW") } },
    { name: { common: "Palestine" }, cca2: "PS", flags: { svg: flag("PS"), png: flag("PS") } },
    { name: { common: "Panama" }, cca2: "PA", flags: { svg: flag("PA"), png: flag("PA") } },
    { name: { common: "Papua New Guinea" }, cca2: "PG", flags: { svg: flag("PG"), png: flag("PG") } },
    { name: { common: "Paraguay" }, cca2: "PY", flags: { svg: flag("PY"), png: flag("PY") } },
    { name: { common: "Peru" }, cca2: "PE", flags: { svg: flag("PE"), png: flag("PE") } },
    { name: { common: "Philippines" }, cca2: "PH", flags: { svg: flag("PH"), png: flag("PH") } },
    { name: { common: "Poland" }, cca2: "PL", flags: { svg: flag("PL"), png: flag("PL") } },
    { name: { common: "Portugal" }, cca2: "PT", flags: { svg: flag("PT"), png: flag("PT") } },
    { name: { common: "Qatar" }, cca2: "QA", flags: { svg: flag("QA"), png: flag("QA") } },
    { name: { common: "Romania" }, cca2: "RO", flags: { svg: flag("RO"), png: flag("RO") } },
    { name: { common: "Russia" }, cca2: "RU", flags: { svg: flag("RU"), png: flag("RU") } },
    { name: { common: "Rwanda" }, cca2: "RW", flags: { svg: flag("RW"), png: flag("RW") } },
    { name: { common: "Saint Kitts and Nevis" }, cca2: "KN", flags: { svg: flag("KN"), png: flag("KN") } },
    { name: { common: "Saint Lucia" }, cca2: "LC", flags: { svg: flag("LC"), png: flag("LC") } },
    { name: { common: "Saint Vincent and the Grenadines" }, cca2: "VC", flags: { svg: flag("VC"), png: flag("VC") } },
    { name: { common: "Samoa" }, cca2: "WS", flags: { svg: flag("WS"), png: flag("WS") } },
    { name: { common: "San Marino" }, cca2: "SM", flags: { svg: flag("SM"), png: flag("SM") } },
    { name: { common: "Sao Tome and Principe" }, cca2: "ST", flags: { svg: flag("ST"), png: flag("ST") } },
    { name: { common: "Saudi Arabia" }, cca2: "SA", flags: { svg: flag("SA"), png: flag("SA") } },
    { name: { common: "Senegal" }, cca2: "SN", flags: { svg: flag("SN"), png: flag("SN") } },
    { name: { common: "Serbia" }, cca2: "RS", flags: { svg: flag("RS"), png: flag("RS") } },
    { name: { common: "Seychelles" }, cca2: "SC", flags: { svg: flag("SC"), png: flag("SC") } },
    { name: { common: "Sierra Leone" }, cca2: "SL", flags: { svg: flag("SL"), png: flag("SL") } },
    { name: { common: "Singapore" }, cca2: "SG", flags: { svg: flag("SG"), png: flag("SG") } },
    { name: { common: "Slovakia" }, cca2: "SK", flags: { svg: flag("SK"), png: flag("SK") } },
    { name: { common: "Slovenia" }, cca2: "SI", flags: { svg: flag("SI"), png: flag("SI") } },
    { name: { common: "Solomon Islands" }, cca2: "SB", flags: { svg: flag("SB"), png: flag("SB") } },
    { name: { common: "Somalia" }, cca2: "SO", flags: { svg: flag("SO"), png: flag("SO") } },
    { name: { common: "South Africa" }, cca2: "ZA", flags: { svg: flag("ZA"), png: flag("ZA") } },
    { name: { common: "South Korea" }, cca2: "KR", flags: { svg: flag("KR"), png: flag("KR") } },
    { name: { common: "South Sudan" }, cca2: "SS", flags: { svg: flag("SS"), png: flag("SS") } },
    { name: { common: "Spain" }, cca2: "ES", flags: { svg: flag("ES"), png: flag("ES") } },
    { name: { common: "Sri Lanka" }, cca2: "LK", flags: { svg: flag("LK"), png: flag("LK") } },
    { name: { common: "Sudan" }, cca2: "SD", flags: { svg: flag("SD"), png: flag("SD") } },
    { name: { common: "Suriname" }, cca2: "SR", flags: { svg: flag("SR"), png: flag("SR") } },
    { name: { common: "Sweden" }, cca2: "SE", flags: { svg: flag("SE"), png: flag("SE") } },
    { name: { common: "Switzerland" }, cca2: "CH", flags: { svg: flag("CH"), png: flag("CH") } },
    { name: { common: "Syria" }, cca2: "SY", flags: { svg: flag("SY"), png: flag("SY") } },
    { name: { common: "Taiwan" }, cca2: "TW", flags: { svg: flag("TW"), png: flag("TW") } },
    { name: { common: "Tajikistan" }, cca2: "TJ", flags: { svg: flag("TJ"), png: flag("TJ") } },
    { name: { common: "Tanzania" }, cca2: "TZ", flags: { svg: flag("TZ"), png: flag("TZ") } },
    { name: { common: "Thailand" }, cca2: "TH", flags: { svg: flag("TH"), png: flag("TH") } },
    { name: { common: "Togo" }, cca2: "TG", flags: { svg: flag("TG"), png: flag("TG") } },
    { name: { common: "Tonga" }, cca2: "TO", flags: { svg: flag("TO"), png: flag("TO") } },
    { name: { common: "Trinidad and Tobago" }, cca2: "TT", flags: { svg: flag("TT"), png: flag("TT") } },
    { name: { common: "Tunisia" }, cca2: "TN", flags: { svg: flag("TN"), png: flag("TN") } },
    { name: { common: "Turkey" }, cca2: "TR", flags: { svg: flag("TR"), png: flag("TR") } },
    { name: { common: "Turkmenistan" }, cca2: "TM", flags: { svg: flag("TM"), png: flag("TM") } },
    { name: { common: "Tuvalu" }, cca2: "TV", flags: { svg: flag("TV"), png: flag("TV") } },
    { name: { common: "Uganda" }, cca2: "UG", flags: { svg: flag("UG"), png: flag("UG") } },
    { name: { common: "Ukraine" }, cca2: "UA", flags: { svg: flag("UA"), png: flag("UA") } },
    { name: { common: "United Arab Emirates" }, cca2: "AE", flags: { svg: flag("AE"), png: flag("AE") } },
    { name: { common: "United Kingdom" }, cca2: "GB", flags: { svg: flag("GB"), png: flag("GB") } },
    { name: { common: "United States" }, cca2: "US", flags: { svg: flag("US"), png: flag("US") } },
    { name: { common: "Uruguay" }, cca2: "UY", flags: { svg: flag("UY"), png: flag("UY") } },
    { name: { common: "Uzbekistan" }, cca2: "UZ", flags: { svg: flag("UZ"), png: flag("UZ") } },
    { name: { common: "Vanuatu" }, cca2: "VU", flags: { svg: flag("VU"), png: flag("VU") } },
    { name: { common: "Vatican City" }, cca2: "VA", flags: { svg: flag("VA"), png: flag("VA") } },
    { name: { common: "Venezuela" }, cca2: "VE", flags: { svg: flag("VE"), png: flag("VE") } },
    { name: { common: "Vietnam" }, cca2: "VN", flags: { svg: flag("VN"), png: flag("VN") } },
    { name: { common: "Yemen" }, cca2: "YE", flags: { svg: flag("YE"), png: flag("YE") } },
    { name: { common: "Zambia" }, cca2: "ZM", flags: { svg: flag("ZM"), png: flag("ZM") } },
    { name: { common: "Zimbabwe" }, cca2: "ZW", flags: { svg: flag("ZW"), png: flag("ZW") } },
];

export const CountrySelect: React.FC<CountrySelectProps> = ({
    value,
    onChange,
    disabled = false,
    className,
    placeholder = "Search country...",
}) => {
    const [countries, setCountries] = useState<Country[]>(cachedCountries || STATIC_COUNTRIES);
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
                    console.error("Failed to fetch countries, using static list:", err);
                    cachedCountries = STATIC_COUNTRIES;
                    setCountries(STATIC_COUNTRIES);
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
        <div ref={containerRef} className="relative z-30">
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
