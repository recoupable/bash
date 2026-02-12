"use client";

import { useEffect, useState, ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import TerminalComponent from "./Terminal";
import { TerminalData } from "./TerminalData";
import { useSetupSandbox } from "../hooks/useSetupSandbox";

export default function TerminalPage({
  agentEndpoint,
  children,
}: {
  agentEndpoint?: string;
  children?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  useSetupSandbox();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !ready) {
    return (
      <>
        {children}
        <TerminalData />
      </>
    );
  }

  if (!authenticated) {
    return (
      <>
        {children}
        <TerminalData />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          <button
            onClick={login}
            style={{
              background: "none",
              border: "1px solid currentColor",
              color: "inherit",
              padding: "12px 24px",
              fontSize: "16px",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Log in to continue
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {children}
      <TerminalData />
      <TerminalComponent
        getAccessToken={getAccessToken}
        agentEndpoint={agentEndpoint}
      />
    </>
  );
}
