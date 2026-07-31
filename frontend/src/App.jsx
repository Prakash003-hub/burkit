import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import BottomNav from './components/BottomNav.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Market from './pages/Market.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import AddProduct from './pages/AddProduct.jsx';
import EditProduct from './pages/EditProduct.jsx';
import Profile from './pages/Profile.jsx';
import MyProducts from './pages/MyProducts.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminCategories from './pages/AdminCategories.jsx';
import AdminSaleRequests from './pages/AdminSaleRequests.jsx';
import SellerSaleRequests from './pages/SellerSaleRequests.jsx';
import BuyerPurchaseRequests from './pages/BuyerPurchaseRequests.jsx';

// Shops Subsystem Pages
import Shops from './pages/Shops.jsx';
import ShopDetails from './pages/ShopDetails.jsx';
import AddShop from './pages/AddShop.jsx';
import EditShop from './pages/EditShop.jsx';
import MyShops from './pages/MyShops.jsx';

import InstallPwaBanner from './components/InstallPwaBanner.jsx';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const isFullPage = location.pathname.startsWith('/product/') || location.pathname.startsWith('/shop/');
  const showNav = user && !['/login', '/register'].includes(location.pathname) && !isFullPage;

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-cloud-100 dark:bg-ink-900 relative">
      <InstallPwaBanner />
      <div className={`flex-1 ${showNav ? 'pb-20' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/market" element={<PrivateRoute><Market /></PrivateRoute>} />
          <Route path="/product/:id" element={<PrivateRoute><ProductDetails /></PrivateRoute>} />
          <Route path="/add-product" element={<PrivateRoute><AddProduct /></PrivateRoute>} />
          <Route path="/edit-product/:id" element={<PrivateRoute><EditProduct /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/my-products" element={<PrivateRoute><MyProducts /></PrivateRoute>} />
          <Route path="/my-sale-requests" element={<PrivateRoute><SellerSaleRequests /></PrivateRoute>} />
          <Route path="/my-purchase-requests" element={<PrivateRoute><BuyerPurchaseRequests /></PrivateRoute>} />

          {/* Shops Routes */}
          <Route path="/shops" element={<PrivateRoute><Shops /></PrivateRoute>} />
          <Route path="/shop/:id" element={<PrivateRoute><ShopDetails /></PrivateRoute>} />
          <Route path="/add-shop" element={<PrivateRoute><AddShop /></PrivateRoute>} />
          <Route path="/edit-shop/:id" element={<PrivateRoute><EditShop /></PrivateRoute>} />
          <Route path="/my-shops" element={<PrivateRoute><MyShops /></PrivateRoute>} />

          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminRoute><AdminDashboard /></AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <PrivateRoute>
                <AdminRoute><AdminCategories /></AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/sale-requests"
            element={
              <PrivateRoute>
                <AdminRoute><AdminSaleRequests /></AdminRoute>
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}
