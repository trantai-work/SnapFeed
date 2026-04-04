import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { MessageBoxProvider } from "./components/MessageBox";
import { UploadDraftProvider } from "./context/UploadDraftContext";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <MessageBoxProvider>
          <UploadDraftProvider>
            <App />
          </UploadDraftProvider>
        </MessageBoxProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);