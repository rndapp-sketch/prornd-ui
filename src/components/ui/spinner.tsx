import React from "react";

export const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <div
    className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"
    style={{
      width: size,
      height: size,
    }}
    role="status"
    aria-label="loading"
  />
);
