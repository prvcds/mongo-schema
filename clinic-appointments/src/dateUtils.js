export function getUpcomingDates(count = 5) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      value: date.toISOString().slice(0, 10),
      weekday: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
      day: new Intl.DateTimeFormat("en", { day: "numeric" }).format(date),
    };
  });
}

export function formatLongDate(value) {
  if (!value) return "Choose a date";
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
