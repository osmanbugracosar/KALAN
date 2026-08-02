export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="37" height="37" rx="10" fill="rgb(var(--k-brand))" />
      {/* "ne kaldı" — bakiye çizgisi: aşağı-yukarı hareket ve kalan bakiye */}
      <path d="M8 26 L14 20 L19 24 L26 14" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      <circle cx="26" cy="14" r="2.6" fill="white" />
      <path d="M8 31 H32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

export function Wordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={30} />
      {!collapsed && (
        <div className="leading-none">
          <div className="text-[17px] font-bold text-ink tracking-tight">Kalan</div>
          <div className="text-[10.5px] text-muted mt-0.5">ne geldi, ne gitti, ne kaldı</div>
        </div>
      )}
    </div>
  );
}
