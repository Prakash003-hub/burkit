import {
  Smartphone, Car, Armchair, Shirt, Utensils, Home, Briefcase,
  Wrench, Leaf, Grid, Tag, Layers
} from 'lucide-react';

const ICON_MAP = {
  smartphone: Smartphone,
  electronics: Smartphone,
  car: Car,
  vehicles: Car,
  sofa: Armchair,
  furniture: Armchair,
  shirt: Shirt,
  fashion: Shirt,
  utensils: Utensils,
  'home & kitchen': Utensils,
  home: Home,
  'real estate': Home,
  briefcase: Briefcase,
  jobs: Briefcase,
  wrench: Wrench,
  services: Wrench,
  leaf: Leaf,
  agriculture: Leaf,
  grid: Grid,
  others: Grid,
};

export default function CategoryPill({ category, active, onClick }) {
  const iconKey = (category?.categoryIcon || category?.icon || category?.categoryName || '').toLowerCase();
  const IconComp = ICON_MAP[iconKey] || Grid;
  const name = category?.categoryName || 'All';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95 ${
        active ? 'scale-105' : 'hover:scale-102'
      }`}
    >
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
          active
            ? 'bg-[#ea580c] text-white shadow-lg ring-2 ring-[#ea580c] ring-offset-2 dark:ring-offset-ink-900'
            : 'bg-white dark:bg-ink-800 text-[#ea580c] border border-slate-200/70 dark:border-ink-700 shadow-sm hover:border-[#ea580c]/50'
        }`}
      >
        <IconComp size={22} strokeWidth={1.8} />
      </div>
      <span
        className={`text-xs text-center max-w-[70px] truncate transition-colors ${
          active
            ? 'font-bold text-[#ea580c] dark:text-[#fb923c]'
            : 'font-medium text-ink-800 dark:text-cloud-100/90'
        }`}
      >
        {name}
      </span>
    </button>
  );
}
