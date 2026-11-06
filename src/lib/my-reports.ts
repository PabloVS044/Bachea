// Comodidad en este dispositivo: recordar folios. Puede fallar en modo privado; nada depende de esto.
const KEY = "bachea:folios";

export function rememberFolio(folio: string) {
  try {
    const current = readFolios().filter((f) => f !== folio);
    localStorage.setItem(KEY, JSON.stringify([folio, ...current].slice(0, 20)));
  } catch { /* sin almacenamiento */ }
}

export function readFolios(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}
