import React from "react";
import ReactDOM from "react-dom/client";
import ErrorBoundary from "@/shared/components/error-boundary";
import App from "./app";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
