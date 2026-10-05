import { formatWhen, type AdminReport } from "@/components/admin/shared";

export function ReportsTable({ reports }: { reports: AdminReport[] | null }) {
  return (
    <section className="mt-8">
      <h2 className="text-title font-semibold tracking-tight">Reported issue</h2>
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface-2">
        <table className="w-full min-w-[40rem] text-left text-ui">
          <thead className="text-caption text-text-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {reports === null ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-text-muted">
                  Loading reports…
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-text-muted">
                  No reports yet.
                </td>
              </tr>
            ) : (
              reports.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 text-text-muted">{row.email || "—"}</td>
                  <td className="px-4 py-3 font-medium">{row.subject}</td>
                  <td className="max-w-sm px-4 py-3 whitespace-pre-wrap text-text-muted">{row.details}</td>
                  <td className="px-4 py-3 text-text-muted">{formatWhen(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
