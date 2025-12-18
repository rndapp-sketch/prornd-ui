import React from "react";

export const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <div
    className="animate-spin rounded-full border-4 border-gray-400 border-t-[#0EA5A4]"
    style={{
      width: size,
      height: size,
    }}
    role="status"
    aria-label="loading"
  />
);
