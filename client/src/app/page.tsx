import {Header} from "@/components/header";
import { ItemsClient } from "@/components/ItemsClient"; 
import type { Item } from "@/types/item";


export default async function Page() {
  const apiBaseUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "gttp://localhost:3001";
  if (!apiBaseUrl){
    throw new Error("Missing API_BASE in client/.env.local");
  }

  const res = await fetch(`${apiBaseUrl}/items`, {cache: "no-store"});
  const data = await res.json()
  const items: Item[] = Array.isArray(data) ? data : (data.items ?? []);
  return (
    <main>
      <Header />
      <section style={{maxWidth: 1100, margin: "0 auto"}}>
        <ItemsClient items={items} apiBaseUrl={apiBaseUrl}/>
      </section>
    </main>

  )
}
