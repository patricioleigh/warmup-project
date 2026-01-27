"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { AuthPanel } from "@/components/AuthPanel";
import { ArticlesClient } from "@/components/ArticlesClient";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";

export default function Page() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  function handleAuthSuccess(accessToken: string) {
    setStoredToken(accessToken);
    setToken(accessToken);
  }

  function handleLogout() {
    clearStoredToken();
    setToken(null);
  }

  return (
    <main>
      <Header onLogout={handleLogout} showLogout={!!token} />
      <section className="page-container">
        {!token ? (
          <AuthPanel apiBaseUrl={apiBaseUrl} onAuthSuccess={handleAuthSuccess} />
        ) : (
          <ArticlesClient
            apiBaseUrl={apiBaseUrl}
            token={token}
            onLogout={handleLogout}
          />
        )}
      </section>
    </main>
  );
}
