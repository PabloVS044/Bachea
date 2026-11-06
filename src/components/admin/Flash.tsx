export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p role="alert" className="mb-4 rounded bg-danger px-4 py-2 font-semibold text-white">{error}</p>;
  if (ok) return <p role="status" className="mb-4 rounded bg-bachea-dark px-4 py-2 font-semibold text-white">{ok}</p>;
  return null;
}
