"use client";

import ReactDOM from "react-dom";

export function FontPreload() {
  if (typeof document === "undefined") return null;

  // Preconnect to external resources for faster connection
  ReactDOM.preconnect("https://fonts.googleapis.cn");
  ReactDOM.preconnect("https://fonts.gstatic.cn");

  return null;
}
