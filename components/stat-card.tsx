export function StatCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-2 text-2xl font-bold">{value}</p>
  </div>;
}