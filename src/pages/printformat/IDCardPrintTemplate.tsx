import React from "react";
import { getUploadedImageUrl } from "@/utils/fileUtils";

// -----------------------------------------------------------------------
// ID Card Print Template
//
// Renders standard ID card (CR80: 85.6mm x 53.98mm) for IIT Guwahati.
// Features Front and Back sides as per official IITG R&D Cell design.
//
// Uses flexbox positioning rendered via html-to-image (toPng) for exact,
// pixel-perfect alignment between browser preview and downloaded PNG/PDF.
// -----------------------------------------------------------------------

export interface IDCardData {
  emp_id__?: string;
  project_number__?: string;
  full_name__?: string;
  dob__?: string;
  blood_group__?: string;
  phone__?: string;
  emergency_phone__?: string;
  designation__?: string;
  department_name__?: string;
  valid_upto__?: string;
  issue_date__?: string;
  present_address__?: string;
  permanent_address__?: string;
  photo_path__?: string;
  sign_path__?: string;
}

interface IDCardPrintTemplateProps {
  data: IDCardData;
}

const formatDateSlash = (dateStr?: string) => {
  if (!dateStr) return "—";
  try {
    const trimmed = dateStr.trim();
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[./-]/);
      const day = String(parseInt(parts[0], 10)).padStart(2, "0");
      const month = String(parseInt(parts[1], 10)).padStart(2, "0");
      const year = parts[2];
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const FrontIDCard: React.FC<{ data: IDCardData }> = ({ data }) => {
  const holderSignature = data.sign_path__ || "";

  return (
    <div
      id="id-card-front"
      className="card-side"
      style={{
        width: "508px",
        minWidth: "508px",
        maxWidth: "508px",
        height: "320px",
        minHeight: "320px",
        maxHeight: "320px",
        backgroundColor: "#FFFFFF",
        color: "#000000",
        fontFamily:
          "'Noto Sans Devanagari', 'Noto Sans', Arial, 'Segoe UI', sans-serif",
        border: "2px solid #000000",
        borderRadius: "10px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
        textRendering: "geometricPrecision",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Background Watermark Logo */}
      <div
        style={{
          position: "absolute",
          top: "60%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.45,
          pointerEvents: "none",
          zIndex: 0,
          width: "240px",
          textAlign: "center",
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}iitg_logos/iitg-logo.svg`}
          alt="Watermark Logo"
          style={{
            width: "220px",
            height: "auto",
            display: "block",
            margin: "0 auto",
            filter: "contrast(1.15) saturate(1.25)",
          }}
          crossOrigin="anonymous"
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header Block: Logo + Title Text Vertically Centered */}
        <div
          style={{
            padding: "6px 10px 4px 10px",
            borderBottom: "1.5px solid #000000",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: "85px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}iitg_logos/iitg-logo.svg`}
              alt="IITG Logo"
              style={{
                height: "85px",
                width: "auto",
                display: "block",
                filter: "contrast(1.18) saturate(1.25) brightness(0.95)",
              }}
              crossOrigin="anonymous"
            />
          </div>

          {/* Title Lines: Centered Vertically relative to Logo */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              paddingLeft: "10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: "19px",
                fontWeight: 800,
                color: "#8A0000",
                WebkitTextStroke: "0.2px #8A0000",
                lineHeight: "1.2",
                margin: 0,
                letterSpacing: "0.3px",
                whiteSpace: "nowrap",
              }}
            >
              भारतीय प्रौद्योगिकी संस्थान गुवाहाटी
            </div>
            <div
              style={{
                fontSize: "15.5px",
                fontWeight: 900,
                color: "#8A0000",
                WebkitTextStroke: "0.2px #8A0000",
                lineHeight: "1.2",
                margin: "2px 0",
                letterSpacing: "-0.1px",
                whiteSpace: "nowrap",
              }}
            >
              INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI
            </div>
            <div
              style={{
                fontSize: "14.5px",
                fontWeight: 800,
                color: "#8A0000",
                WebkitTextStroke: "0.2px #8A0000",
                letterSpacing: "0.5px",
                lineHeight: "1.2",
                margin: 0,
                whiteSpace: "nowrap",
              }}
            >
              RESEARCH AND DEVELOPMENT CELL
            </div>
            <div
              style={{
                fontSize: "8.5px",
                fontWeight: 800,
                color: "#8A0000",
                WebkitTextStroke: "0.15px #8A0000",
                letterSpacing: "0.3px",
                lineHeight: "1.2",
                margin: 0,
                whiteSpace: "nowrap",
              }}
            >
              (An autonomous Institution of National Importance under MoE, GOI)
            </div>
          </div>
        </div>

        {/* Sub-header Bar (ID No & Project No) */}
        <div
          style={{
            padding: "4px 10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1.5px solid #000000",
            fontSize: "12px",
            fontWeight: 800,
            color: "#000000",
            WebkitTextStroke: "0.15px #000000",
            whiteSpace: "nowrap",
          }}
        >
          <div>ID No: {data.emp_id__ || "—"}</div>
          <div>Project No: {data.project_number__ || "—"}</div>
        </div>

        {/* Main Content Area (Photo + Holder Details) */}
        <div
          style={{
            padding: "8px 10px 4px 10px",
            display: "flex",
            gap: "14px",
            alignItems: "center",
          }}
        >
          {/* Photo Box */}
          <div
            style={{
              width: "105px",
              height: "124px",
              border: "1.5px solid #000000",
              backgroundColor: "#F3F4F6",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {data.photo_path__ ? (
              <img
                src={getUploadedImageUrl(data.photo_path__)}
                alt="Holder Photo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.1) saturate(1.12) brightness(0.96)",
                }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#6B7280",
                  textAlign: "center",
                }}
              >
                Photo
              </div>
            )}
          </div>

          {/* Details Column */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              lineHeight: "1.5",
              color: "#000000",
              WebkitTextStroke: "0.15px #000000",
            }}
          >
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#000000",
                }}
              >
                Name:
              </span>{" "}
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "#000000",
                }}
              >
                {data.full_name__ || "—"}
              </span>
            </div>
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#000000",
                }}
              >
                Date Of Birth:
              </span>{" "}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#000000",
                }}
              >
                {formatDateSlash(data.dob__)}
              </span>
            </div>
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#000000",
                }}
              >
                Designation:
              </span>{" "}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#000000",
                }}
              >
                {data.designation__ || "—"}
              </span>
            </div>
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#000000",
                }}
              >
                Dept./Centre:
              </span>{" "}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#000000",
                }}
              >
                {data.department_name__ || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Signatures & Valid Upto */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0px 10px 6px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          color: "#000000",
          WebkitTextStroke: "0.15px #000000",
        }}
      >
        {/* Holder Signature */}
        <div style={{ textAlign: "center", width: "140px" }}>
          <div
            style={{
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {holderSignature ? (
              <img
                src={getUploadedImageUrl(holderSignature)}
                alt="Holder Signature"
                style={{
                  maxHeight: "30px",
                  maxWidth: "130px",
                  objectFit: "contain",
                  filter:
                    "contrast(1.6) brightness(0.7) drop-shadow(0 0 0.2px #000000)",
                }}
                crossOrigin="anonymous"
              />
            ) : null}
          </div>
          <div
            style={{
              fontSize: "11.5px",
              fontWeight: 800,
              marginTop: "2px",
              color: "#000000",
              whiteSpace: "nowrap",
            }}
          >
            Holder's Signature
          </div>
        </div>

        {/* Valid Upto */}
        <div style={{ textAlign: "center", minWidth: "120px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              marginBottom: "1px",
              color: "#000000",
              whiteSpace: "nowrap",
            }}
          >
            Valid Upto:
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 900,
              color: "#000000",
              lineHeight: "1.2",
              whiteSpace: "nowrap",
            }}
          >
            {formatDateSlash(data.valid_upto__)}
          </div>
        </div>

        {/* Associate Dean Signature */}
        <div style={{ textAlign: "center", width: "160px" }}>
          <div
            style={{
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}signatures/transparent-adornd-signature.webp`}
              alt="Associate Dean Signature"
              style={{
                maxHeight: "32px",
                maxWidth: "150px",
                objectFit: "contain",
                filter: "contrast(1.4) brightness(0.75) saturate(1.3)",
              }}
              crossOrigin="anonymous"
            />
          </div>
          <div
            style={{
              fontSize: "11.5px",
              fontWeight: 800,
              marginTop: "2px",
              color: "#000000",
              whiteSpace: "nowrap",
            }}
          >
            Associate Dean (R&D)
          </div>
        </div>
      </div>
    </div>
  );
};

export const BackIDCard: React.FC<{ data: IDCardData }> = ({ data }) => {
  return (
    <div
      id="id-card-back"
      className="card-side"
      style={{
        width: "508px",
        minWidth: "508px",
        maxWidth: "508px",
        height: "320px",
        minHeight: "320px",
        maxHeight: "320px",
        backgroundColor: "#FFFFFF",
        color: "#000000",
        fontFamily:
          "'Noto Sans Devanagari', 'Noto Sans', Arial, 'Segoe UI', sans-serif",
        border: "2px solid #000000",
        borderRadius: "10px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
        textRendering: "geometricPrecision",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Background Watermark Logo */}
      <div
        style={{
          position: "absolute",
          top: "46%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.45,
          pointerEvents: "none",
          zIndex: 0,
          width: "240px",
          textAlign: "center",
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}iitg_logos/iitg-logo.svg`}
          alt="Watermark Logo"
          style={{
            width: "220px",
            height: "auto",
            display: "block",
            margin: "0 auto",
            filter: "contrast(1.15) saturate(1.25)",
          }}
          crossOrigin="anonymous"
        />
      </div>

      {/* Content Container (above watermark) */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          backgroundColor: "transparent",
        }}
      >
        {/* Top Section */}
        <div style={{ backgroundColor: "transparent" }}>
          {/* Top Row: Emergency No, Date of Issue, Blood Group */}
          <div
            style={{
              padding: "8px 10px 6px 10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#000000",
              borderBottom: "1.5px solid #000000",
              backgroundColor: "transparent",
              WebkitTextStroke: "0.15px #000000",
            }}
          >
            <div style={{ whiteSpace: "nowrap" }}>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                }}
              >
                Emergency No:
              </span>{" "}
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: 800,
                  color: "#000000",
                }}
              >
                {data.emergency_phone__ || "—"}
              </span>
            </div>
            <div style={{ whiteSpace: "nowrap" }}>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                }}
              >
                Date of Issue:
              </span>{" "}
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: 800,
                  color: "#000000",
                }}
              >
                {formatDateSlash(data.issue_date__)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "#000000",
                backgroundColor: "transparent",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                }}
              >
                Blood Group:
              </span>{" "}
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: 800,
                  color: "#000000",
                }}
              >
                {data.blood_group__ || "—"}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="#B90000"
                stroke="#800000"
                strokeWidth="1.2"
                style={{ filter: "contrast(1.2)" }}
              >
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Center Section: Address Table with Curved Corners & 2px Border Lines */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 12px",
            backgroundColor: "transparent",
          }}
        >
          <div
            style={{
              width: "100%",
              borderRadius: "8px",
              border: "2px solid #000000",
              overflow: "hidden",
              backgroundColor: "transparent",
            }}
          >
            <table
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                fontSize: "11px",
                backgroundColor: "transparent",
              }}
            >
              <tbody>
                <tr
                  style={{
                    borderBottom: "2px solid #000000",
                    backgroundColor: "transparent",
                  }}
                >
                  <td
                    style={{
                      width: "32%",
                      padding: "8px 10px",
                      fontWeight: 800,
                      borderRight: "2px solid #000000",
                      verticalAlign: "middle",
                      color: "#000000",
                      backgroundColor: "transparent",
                      whiteSpace: "nowrap",
                      WebkitTextStroke: "0.15px #000000",
                    }}
                  >
                    Permanent Address
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      fontSize: "12.5px",
                      fontWeight: 800,
                      verticalAlign: "middle",
                      lineHeight: "1.35",
                      color: "#000000",
                      backgroundColor: "transparent",
                      wordBreak: "break-word",
                      WebkitTextStroke: "0.15px #000000",
                    }}
                  >
                    {data.permanent_address__ || "—"}
                  </td>
                </tr>
                <tr style={{ backgroundColor: "transparent" }}>
                  <td
                    style={{
                      width: "32%",
                      padding: "8px 10px",
                      fontWeight: 800,
                      borderRight: "2px solid #000000",
                      verticalAlign: "middle",
                      color: "#000000",
                      backgroundColor: "transparent",
                      whiteSpace: "nowrap",
                      WebkitTextStroke: "0.15px #000000",
                    }}
                  >
                    Present Address
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      fontSize: "12.5px",
                      fontWeight: 800,
                      verticalAlign: "middle",
                      lineHeight: "1.35",
                      color: "#000000",
                      backgroundColor: "transparent",
                      wordBreak: "break-word",
                      WebkitTextStroke: "0.15px #000000",
                    }}
                  >
                    {data.present_address__ || "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Center Notice */}
        <div
          style={{
            padding: "0 15px 10px 15px",
            textAlign: "center",
            fontSize: "10.5px",
            fontWeight: 800,
            color: "#000000",
            lineHeight: "1.35",
            backgroundColor: "transparent",
            WebkitTextStroke: "0.15px #000000",
          }}
        >
          <div style={{ backgroundColor: "transparent" }}>
            This card is not transferable, if found or in case of any
            information, please contact Registrar, Indian Institute of
            Technology Guwahati, Guwahati-781039 Assam, India
          </div>
          <div
            style={{
              marginTop: "3px",
              backgroundColor: "transparent",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            Phone No: +91-361-2582133, 2582949
          </div>
        </div>
      </div>
    </div>
  );
};

const IDCardPrintTemplate: React.FC<IDCardPrintTemplateProps> = ({ data }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#6B7280",
            marginBottom: "4px",
            textAlign: "left",
          }}
        >
          FRONT SIDE
        </div>
        <FrontIDCard data={data} />
      </div>
      <div>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#6B7280",
            marginBottom: "4px",
            textAlign: "left",
          }}
        >
          BACK SIDE
        </div>
        <BackIDCard data={data} />
      </div>
    </div>
  );
};

export default IDCardPrintTemplate;
