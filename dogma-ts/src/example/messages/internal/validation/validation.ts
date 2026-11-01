// Package validation contains some message validation helpers.

// isValidDate returns true if the given date is a valid format.
export function isValidDate(date: string): boolean {
  if (date === "") {
    return false;
  }
  const dt = new Date(date);
  return !Number.isNaN(dt.getTime());
}
