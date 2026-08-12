import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import "./index.css";

const storedTheme = localStorage.getItem("dusk-theme");

if (storedTheme && storedTheme !== "system") {
  document.documentElement.setAttribute("data-theme", storedTheme);
  document.documentElement.style.colorScheme = storedTheme === "high-contrast" ? "light" : storedTheme;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
