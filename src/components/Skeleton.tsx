export function PageSkeleton({ label = 'กำลังโหลดข้อมูล' }: { label?: string }) {
  return <div className="space-y-5" role="status" aria-live="polite" aria-label={label}>
    <div className="flex items-center justify-between"><div className="space-y-2"><div className="skeleton h-4 w-32" /><div className="skeleton h-8 w-64" /></div><div className="skeleton h-10 w-28" /></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="rounded-2xl bg-white p-5 shadow-sm"><div className="skeleton h-3 w-24" /><div className="skeleton mt-4 h-9 w-20" /><div className="skeleton mt-4 h-3 w-32" /></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-3"><div className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2"><div className="skeleton h-5 w-48" /><div className="skeleton mt-6 h-56 w-full" /></div><div className="rounded-2xl bg-white p-5 shadow-sm"><div className="skeleton h-5 w-40" /><div className="skeleton mt-6 h-56 w-full" /></div></div>
  </div>;
}

export function InlineSkeleton() { return <div className="skeleton h-4 w-24" aria-hidden="true" />; }
