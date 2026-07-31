import { NavLink } from 'react-router-dom';
import { Home, Store, ShoppingBag, User } from 'lucide-react';

const items = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/market', label: 'Market', icon: Store },
  { to: '/shops', label: 'Shops', icon: ShoppingBag },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-40">
      <div className="mx-3 mb-3 p-2 rounded-3xl bg-white shadow-2xl border border-slate-200/80 backdrop-blur-xl flex items-center justify-around">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-[#ea580c] font-bold'
                  : 'text-zinc-800 hover:text-black font-bold'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/30 scale-105'
                      : 'bg-transparent text-zinc-800'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[11px] font-extrabold ${isActive ? 'text-[#ea580c]' : 'text-zinc-800'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
