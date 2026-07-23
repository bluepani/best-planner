import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, Show } from "@clerk/react";
import App from "./App.jsx";
import AuthPage from "./components/AuthPage.jsx";
import SSOCallback from "./components/SSOCallback.jsx";
import "./styles.css";

function Root() {
  if (window.location.pathname === "/sso-callback") {
    return <SSOCallback />;
  }

  return (
    <>
      <Show when="signed-out">
        <AuthPage />
      </Show>
      <Show when="signed-in">
        <App />
      </Show>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider afterSignOutUrl="/">
      <Root />
    </ClerkProvider>
  </React.StrictMode>,
);
