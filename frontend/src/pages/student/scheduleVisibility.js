export const utcDay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const scheduleHaystack = (item) => [
  item.subject?.code,
  item.subject?.name,
  item.examination?.title,
].filter(Boolean).join(" ").toLowerCase();

const isPersistedSchedule = (item) => {
  if (!item || item.status !== "scheduled" || !item.date) return false;
  if (!item.subject || typeof item.subject !== "object") return false;
  return Boolean(item.subject.code || item.subject.name || item.subject.id || item.subject._id);
};

export const visibleSchedules = (items, { tab = "all", search = "", semester = "All", today = utcDay(new Date()) } = {}) => {
  const query = search.trim().toLowerCase();

  return (Array.isArray(items) ? items : []).filter((item) => {
    if (!isPersistedSchedule(item)) return false;

    const day = utcDay(item.date);
    if (tab === "upcoming" && day < today) return false;
    if (tab === "completed" && day >= today) return false;

    if (semester !== "All" && String(item.examination?.semester ?? "") !== String(semester)) {
      return false;
    }

    if (query && !scheduleHaystack(item).includes(query)) return false;
    return true;
  });
};
