export default function Header({ title = 'BurKIt Smartcity', subtitle, right }) {
  return (
    <div className="mx-4 mt-4 mb-3 p-4 rounded-2xl bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#27272a] text-white shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="BurKIt Smartcity Logo" className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-black text-xl text-white tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-orange-100/90 font-medium mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0 ml-2">{right}</div>}
    </div>
  );
}
