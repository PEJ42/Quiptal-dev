const dollarPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function dollarsToCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  if (!dollarPattern.test(normalized)) return value;
  const [dollars, fraction = ""] = normalized.split(".");
  return Number(dollars) * 100 + Number(`${fraction}00`.slice(0, 2));
}

export function centsToDollars(value: number | null | undefined) {
  return value === null || value === undefined ? "" : (value / 100).toFixed(2);
}
