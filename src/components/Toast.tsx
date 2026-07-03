export function Toast({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-soft">{message}</div>;
}
