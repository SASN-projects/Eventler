export const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatTimeRange = (fromStr: string, toStr: string) => {
  if (!fromStr) return "";
  const from = new Date(fromStr);
  const fromTime = from.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!toStr) return fromTime;
  const to = new Date(toStr);
  const toTime = to.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fromTime} - ${toTime}`;
};
