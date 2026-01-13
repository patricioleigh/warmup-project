"use client";

import { useRouter } from "next/navigation";
import { ItemsList } from "./ItemsList";
import type { Item } from "@/types/item";



export function ItemsClient({
    items,
    apiBaseUrl,
}: {
    items: Item[];
    apiBaseUrl: string;
}){
    const router = useRouter();

    async function onDelete(id:string){
        await fetch(`${apiBaseUrl}/items/${id}/delete`, {
            method: "PATCH",
        });
        router.refresh();
    }
    return <ItemsList items={items} onDelete={onDelete}/>;
}