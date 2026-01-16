"use client";

import { useEffect, useMemo, useState } from "react";
import { ItemsList } from "./ItemsList";
import type { Item } from "@/types/item";

type ArticlesResponse = {
  items: Item[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
};

type ArticlesClientProps = {
  apiBaseUrl: string;
  token: string;
  onLogout: () => void;
};

export function ArticlesClient({ apiBaseUrl, token, onLogout }: ArticlesClientProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPending(true);
      setError(null);

      try {
        const res = await fetch(
          `${apiBaseUrl}/articles?page=${page}&limit=${limit}`,
          {
            headers: requestHeaders,
            cache: "no-store",
          },
        );

        if (res.status === 401) {
          onLogout();
          return;
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load articles");
        }

        const payload = (await res.json()) as ArticlesResponse;
        if (cancelled) return;

        setItems(payload.items ?? []);
        setHasNextPage(Boolean(payload.hasNextPage));
        setTotal(payload.total ?? 0);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load articles");
        }
      } finally {
        if (!cancelled) {
          setPending(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, limit, onLogout, page, requestHeaders]);

  async function handleDelete(objectId: string) {
    if (!objectId) return;

    const previousItems = items;
    setItems((current) => current.filter((item) => item.objectId !== objectId));

    try {
      const res = await fetch(`${apiBaseUrl}/articles/${objectId}`, {
        method: "DELETE",
        headers: requestHeaders,
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message ?? "Failed to delete article");
      }
    } catch (err: any) {
      setItems(previousItems);
      setError(err?.message ?? "Failed to delete article");
    }
  }

  return (
    <section className="articles-panel">
      <div className="articles-toolbar">
        <div>
          <h2>Latest articles</h2>
          <p className="articles-meta">
            {pending ? "Loading..." : `${total} items`}
          </p>
        </div>
        <button type="button" className="logout-btn" onClick={onLogout}>
          Log out
        </button>
      </div>

      {error ? <p className="articles-error">{error}</p> : null}
      <ItemsList items={items} onDelete={handleDelete} />

      <div className="articles-pagination">
        <button
          type="button"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1 || pending}
        >
          Previous
        </button>
        <span>
          Page {page}
        </span>
        <button
          type="button"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!hasNextPage || pending}
        >
          Next
        </button>
      </div>
    </section>
  );
}
