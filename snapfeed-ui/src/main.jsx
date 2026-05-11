import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { RealtimeSocketProvider } from "./context/RealtimeSocketContext";
import { ChatUnreadProvider } from "./context/ChatUnreadContext";
import { ChatUIProvider } from "./context/ChatUIContext";
import { MessageBoxProvider } from "./components/MessageBox";
import { UploadDraftProvider } from "./context/UploadDraftContext";
import { ThemeProvider } from "./context/ThemeContext";
import { VideoCallProvider } from "./context/VideoCallContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <RealtimeSocketProvider>
          <ChatUnreadProvider>
            <ChatUIProvider>
              <MessageBoxProvider>
                <UploadDraftProvider>
                  <VideoCallProvider>
                    <App />
                  </VideoCallProvider>
                </UploadDraftProvider>
              </MessageBoxProvider>
            </ChatUIProvider>
          </ChatUnreadProvider>
        </RealtimeSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);