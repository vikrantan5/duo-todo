export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative h-8 w-10">
        <span className="absolute left-0 top-1 h-6 w-6 rounded-full border-2 border-brand-violet" />
        <span className="absolute right-0 top-1 h-6 w-6 rounded-full border-2 border-brand-emerald" />
      </div>
      <span className="font-display text-lg tracking-tight">Duo Todo</span>
    </div>
  );
}
