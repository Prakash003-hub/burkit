import { useNavigate } from 'react-router-dom';
import { Bookmark, ChevronRight, LogOut, Package, PlusCircle, Settings, ShieldCheck, Layers, ShoppingBag, MessageSquareText, FileText, Store, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const menu = [
    { icon: Download, label: 'Install Mobile App (செயலியை நிறுவவும்)', to: '#install', isInstall: true },
    { icon: Store, label: 'My Shops (என் கடைகள்)', to: '/my-shops' },
    { icon: Package, label: 'My Products', to: '/my-products' },
    { icon: MessageSquareText, label: 'My Sale Requests (Seller)', to: '/my-sale-requests' },
    { icon: ShoppingBag, label: 'My Purchase Requests (Buyer)', to: '/my-purchase-requests' },
    { icon: Store, label: 'Register New Shop', to: '/add-shop' },
    { icon: PlusCircle, label: 'Add Product', to: '/add-product' },
    { icon: Bookmark, label: 'Saved Products', to: '/profile' },
    { icon: Settings, label: 'Settings', to: '/profile' },
  ];

  if (isAdmin) {
    menu.push({ icon: ShieldCheck, label: 'Admin Dashboard', to: '/admin' });
    menu.push({ icon: Layers, label: 'Manage Categories', to: '/admin/categories' });
    menu.push({ icon: FileText, label: 'Sale Request Records', to: '/admin/sale-requests' });
  }

  return (
    <div>
      <div className="px-5 pt-8 pb-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold overflow-hidden">
          {user?.profileImage ? (
            <img src={user.profileImage} className="w-full h-full object-cover" />
          ) : (
            (user?.name || '?').charAt(0).toUpperCase()
          )}
        </div>
        <h1 className="font-display font-bold text-xl mt-3">{user?.name}</h1>
        <p className="text-sm text-ink-700/60 dark:text-cloud-100/60">+91 {user?.mobile}</p>
        <p className="text-xs text-ink-700/60 dark:text-cloud-100/60 mt-0.5 font-medium">
          {user?.streetName ? `${user.streetName}, ` : ''}{user?.area ? `${user.area}, ` : ''}{user?.district}
        </p>
      </div>

      <div className="px-5 space-y-2 pb-12">
        {menu.map(({ icon: Icon, label, to }, idx) => (
          <button
            key={`${label}_${idx}`}
            onClick={() => navigate(to)}
            className="card w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center">
                <Icon size={17} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </div>
            <ChevronRight size={16} className="text-ink-700/30" />
          </button>
        ))}

        <button
          onClick={handleLogout}
          className="card w-full flex items-center gap-3 p-4 text-red-500"
        >
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <LogOut size={17} />
          </div>
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
