import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css";
import App from "./App.jsx";
import { AuthProvider } from "./lib/AuthContext.jsx";
import { BuscaProvider } from "./lib/buscaContext.jsx";

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BuscaProvider>
        <App />
      </BuscaProvider>
    </AuthProvider>
  </StrictMode>,
);
