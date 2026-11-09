export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return d.toLocaleString();
  }
}
