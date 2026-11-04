// Feature flags for modules that are merged but not ready to ship.
// Each flag is off unless its env var is exactly "true", so a server whose
// .env / .env.production doesn't mention it (testing, production) keeps the
// module hidden. Turn one on locally by adding the variable to your .env.

/** UC Request module: project tile, /uc-request routes and the Registrar upload queue. */
export const UC_REQUEST_ENABLED = import.meta.env.VITE_ENABLE_UC_REQUEST === "true";
