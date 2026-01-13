export function formatCreatedAt(createdAt: Date | string){
    const d = createdAt instanceof Date ? createdAt : new Date(createdAt);

    const now = new Date();

    const starOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const starOfYesterday = new Date(starOfToday);
    starOfYesterday.setDate(starOfYesterday.getDate() - 1);

    if (d >= starOfToday){
        return d.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    if (d >= starOfYesterday) {
        return "Yesterday";
    }

    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
    })


}