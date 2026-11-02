/**
 * Projects that started as consultancy projects and were converted to research projects (2026-27).
 * Staff are matched on either number, since records may still carry the old project no.
 */
export const CONSULTANCY_TO_RESEARCH_PROJECTS: { oldNo: string; newNo: string; piEmail: string }[] = [
    { oldNo: "xPHYISPISRO01396xBKZ101", newNo: "2627R-0161-PHYS1396BIKR", piEmail: "bkhazra@iitg.ac.in" },
    { oldNo: "xxCEISPISRO01121xAMN101", newNo: "2627R-0333-CIEN1121ARCM", piEmail: "archana@iitg.ac.in" },
    { oldNo: "xxMEISPISRO00103xxRT101", newNo: "2627R-0160-MECH0103RART", piEmail: "rtiwari@iitg.ac.in" },
    { oldNo: "xxMEISPISRO00815xSNJ101", newNo: "2627R-0159-MECH0815SHNA", piEmail: "snj@iitg.ac.in" },
    { oldNo: "xEEEISPISRO01343MBHT101", newNo: "2627R-0162-EEEN1343MANI", piEmail: "manishb@iitg.ac.in" },
    { oldNo: "xEEEISPISRO01237xRDK101", newNo: "2627R-0319-EEEN1237RIDI", piEmail: "rishi.k@iitg.ac.in" },
    { oldNo: "xEEEISPISRO01347ASAW101", newNo: "2627R-0169-EEEN1347AWSW", piEmail: "ashwinisawant" },
    { oldNo: "xCLEISPISRO00969xRPV101", newNo: "2627R-0318-CLEG0969PRVE", piEmail: "rprasanna@iitg.ac.in" },
    { oldNo: "xCEEISPISRO01360RTHA101", newNo: "2627R-0231-SESE1360RJTG", piEmail: "ranjith.t@iitg.ac.in" },
    { oldNo: "SARTISPISRO01473DMAN101", newNo: "2627R-0229-SOAA1473DIPD", piEmail: "dmandal@iitg.ac.in" },
    { oldNo: "NANOISPISRO01122AKAS101B", newNo: "2627R-0234-CHEM1122AKSH", piEmail: "akshaikumar@iitg.ac.in" },
    { oldNo: "xPHYISPISRO00982xxGK101B", newNo: "2627R-0236-EEEN1218DEBA", piEmail: "deb.sikdar@iitg.ac.in" },
    { oldNo: "xxMEISPISRO00820xxAB101", newNo: "2627R-0332-MECH0820ATAA", piEmail: "atanub@iitg.ac.in" },
    { oldNo: "MSHSISPISRO00764xxDP102", newNo: "2627R-0163-CHST0764DOBB", piEmail: "pamuhcu@iitg.ac.in" },
    { oldNo: "xxMEISPISRO01319xTKM102", newNo: "2627R-0158-MECH1319TAKR", piEmail: "tapan.mankodi@iitg.ac.in" },
    { oldNo: "xPHYISPISRO00764xxDP101B", newNo: "2627R-0235-PHYS0764DOBB", piEmail: "pamuhcu@iitg.ac.in" },
    { oldNo: "IITGISPISRO00415xxSD102B", newNo: "2627R-0222-CIEN0415UBAS", piEmail: "Subashisa@iitg.ac.in" },
    { oldNo: "", newNo: "2627R-0374-STCX0008STCL", piEmail: "stc_iitg@iitg.ac.in" },
];

const norm = (v?: string | null) => (v || "").trim().toUpperCase();

const CONVERTED_PROJECT_NOS = new Set(
    CONSULTANCY_TO_RESEARCH_PROJECTS.flatMap((p) => [norm(p.oldNo), norm(p.newNo)]).filter(Boolean),
);

/** True when the project number (old or new) belongs to a consultancy project converted to research. */
export const isConsultancyToResearchProject = (projectNo?: string | null): boolean =>
    CONVERTED_PROJECT_NOS.has(norm(projectNo));
