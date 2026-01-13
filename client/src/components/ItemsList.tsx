import { formatCreatedAt } from "@/lib/date"
import type { Item } from "@/types/item";
import { Trash2 } from "lucide-react";

export function ItemsList({ 
    items,
    onDelete, 
}: {
    items: Item[];
    onDelete: (id:string) => void;
}){
    return (
        <ul className="items-list">
            {items.map((item, idx) => {
                const id = String(item.objectId ?? "");
                const key = String(item.objectId ?? idx);
                const title = item.title ?? "(Sin titulo)";
                const author = item.author ?? "(Sin autor)";
                const createAt = item.createdAt ?? "";
                const href = item.url ?? "";

                function openLink() {
                    if (!href) return;
                    window.open(href, "_blank", "noopener,noreferrer");
                }

                return (
                    <li 
                        key={key} 
                        className="items-row"
                        onClick={openLink}
                        role={href ? "link" : undefined}
                        tabIndex={href ? 0 : -1}
                        onKeyDown={(e) => {
                            if (!href) return;
                            if (e.key == "Enter" || e.key == " ") openLink()
                        }}
                        style={{cursor: href ? "pointer" : "default"}}
                        >
                        <div className="items-left">
                            <span className="items-title">{title}</span>
                            <span className="items-author">- {author} -</span>
                        </div>
                        <div className="items-right">
                            <span className="items-date">{formatCreatedAt(createAt)}</span>
                            <button
                                className="items-delete"
                                aria-label="Dalete item"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(id);
                                }}
                                disabled={!id}
                                title="Delete"
                            >
                              <Trash2 size={18} className="items-delete-icon"/>
                            </button>
                        </div>
                    </li>
                );
            })}
        </ul>
    )
}