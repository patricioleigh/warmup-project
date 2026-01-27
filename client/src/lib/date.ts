export function formatCreatedAt(createdAt: Date | string) {
    const d = createdAt instanceof Date ? createdAt : new Date(createdAt);

    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    if (d >= startOfToday) {
        return d.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "UTC",
        });
    }

    if (d >= startOfYesterday) {
        return "Yesterday";
    }

    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}