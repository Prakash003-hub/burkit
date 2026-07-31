import axios from 'axios';
import { GROCERY_DEFAULT_ITEMS } from '../data/groceryDefaults.js';

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbx1R1N5s03V0XULHcRo90l3JB_nXJPoEoB5wECqZBotAjsaCf3Npxr2lVqGQF6aXjrs/exec';
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

const client = axios.create({ baseURL: API_URL });

let activeRequestsCount = 0;
const loadingListeners = new Set();

function notifyLoadingListeners() {
  const isLoading = activeRequestsCount > 0;
  loadingListeners.forEach((cb) => {
    try {
      cb(isLoading, activeRequestsCount);
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeToApiLoading(callback) {
  loadingListeners.add(callback);
  callback(activeRequestsCount > 0, activeRequestsCount);
  return () => loadingListeners.delete(callback);
}

async function get(action, params = {}) {
  activeRequestsCount++;
  notifyLoadingListeners();
  if (!API_URL) {
    try {
      return await localGet(action, params);
    } finally {
      activeRequestsCount = Math.max(0, activeRequestsCount - 1);
      notifyLoadingListeners();
    }
  }
  try {
    const res = await client.get('', { params: { action, ...params } });
    if (!res.data || !res.data.success) throw new Error((res.data && res.data.error) || 'Request failed');
    return res.data.data;
  } catch (err) {
    console.warn(`API get error (${action}), falling back to local handler:`, err.message);
    return localGet(action, params);
  } finally {
    activeRequestsCount = Math.max(0, activeRequestsCount - 1);
    notifyLoadingListeners();
  }
}

async function post(action, body = {}) {
  activeRequestsCount++;
  notifyLoadingListeners();
  if (!API_URL) {
    try {
      return await localPost(action, body);
    } finally {
      activeRequestsCount = Math.max(0, activeRequestsCount - 1);
      notifyLoadingListeners();
    }
  }
  try {
    const res = await axios.post(`${API_URL}?action=${action}`, JSON.stringify(body), {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    if (!res.data || !res.data.success) throw new Error((res.data && res.data.error) || 'Request failed');
    return res.data.data;
  } catch (err) {
    // If the API server returned an explicit error (e.g. function missing in GAS), throw it so the UI alerts the user
    if (err.message && !err.message.includes('Network Error') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    console.warn(`API post error (${action}), falling back to local handler:`, err.message);
    return localPost(action, body);
  } finally {
    activeRequestsCount = Math.max(0, activeRequestsCount - 1);
    notifyLoadingListeners();
  }
}

// Local storage helpers for shops and shop products when Google Apps Script is unconfigured/offline
function getLocalShops() {
  try {
    const data = localStorage.getItem('burkit_shops');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalShops(shops) {
  try {
    localStorage.setItem('burkit_shops', JSON.stringify(shops));
  } catch (e) {
    console.error(e);
  }
}

function getLocalShopProducts() {
  try {
    const data = localStorage.getItem('burkit_shop_products');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalShopProducts(products) {
  try {
    localStorage.setItem('burkit_shop_products', JSON.stringify(products));
  } catch (e) {
    console.error(e);
  }
}

// Purge legacy dummy seed data (SHP001, SHP002, SHP003, etc.) from browser localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const localShops = localStorage.getItem('burkit_shops');
    if (localShops) {
      const parsed = JSON.parse(localShops);
      const cleaned = parsed.filter((s) => !['SHP001', 'SHP002', 'SHP003'].includes(s.shopId));
      localStorage.setItem('burkit_shops', JSON.stringify(cleaned));
    }
    const localProducts = localStorage.getItem('burkit_shop_products');
    if (localProducts) {
      const parsed = JSON.parse(localProducts);
      const cleaned = parsed.filter(
        (p) =>
          !['SHP001', 'SHP002', 'SHP003'].includes(p.shopId) &&
          !String(p.productId).startsWith('SP_DEF_') &&
          !String(p.productId).startsWith('SP_HOTEL_')
      );
      localStorage.setItem('burkit_shop_products', JSON.stringify(cleaned));
    }
  }
} catch (e) {
  console.error('LocalStorage cleanup error:', e);
}

function getSeedShops() {
  return [];
}

function getSeedShopProducts() {
  return [];
}

function getLocalProducts() {
  try {
    const data = localStorage.getItem('burkit_products');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalProducts(products) {
  try {
    localStorage.setItem('burkit_products', JSON.stringify(products));
  } catch (e) {
    console.error(e);
  }
}

function getLocalSaleRequests() {
  try {
    const data = localStorage.getItem('burkit_sale_requests');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalSaleRequests(reqs) {
  try {
    localStorage.setItem('burkit_sale_requests', JSON.stringify(reqs));
  } catch (e) {
    console.error(e);
  }
}

function localGet(action, params = {}) {
  const shops = getLocalShops();
  const shopProducts = getLocalShopProducts();

  if (action === 'shops') {
    let result = [...shops];
    if (params.status && params.status !== 'all') {
      result = result.filter((s) => s.status === params.status);
    } else if (!params.status) {
      result = result.filter((s) => s.status === 'Approved');
    }
    if (params.category && params.category !== 'All') {
      result = result.filter((s) => String(s.category).toLowerCase() === String(params.category).toLowerCase());
    }
    if (params.ownerUserId) {
      result = result.filter((s) => String(s.ownerUserId) === String(params.ownerUserId));
    }
    return Promise.resolve(result);
  }

  if (action === 'shop') {
    const found = shops.find((s) => String(s.shopId) === String(params.shopId));
    if (!found) return Promise.reject(new Error('Shop not found'));
    return Promise.resolve(found);
  }

  if (action === 'shop-products') {
    let result = [...shopProducts];
    if (params.shopId) {
      result = result.filter((p) => String(p.shopId) === String(params.shopId));
    }
    return Promise.resolve(result);
  }

  if (action === 'products' || action === 'pending-products') {
    let products = getLocalProducts();
    if (action === 'pending-products') {
      return Promise.resolve(products.filter((p) => p.status === 'Pending'));
    }
    if (params.status && params.status !== 'all') {
      products = products.filter((p) => p.status === params.status);
    } else if (!params.status) {
      products = products.filter((p) => p.status === 'Approved');
    }
    if (params.category && params.category !== 'All') {
      products = products.filter((p) => String(p.category).toLowerCase() === String(params.category).toLowerCase());
    }
    if (params.sellerId) {
      products = products.filter((p) => String(p.sellerId) === String(params.sellerId));
    }
    return Promise.resolve(products);
  }

  if (action === 'product') {
    const products = getLocalProducts();
    const found = products.find((p) => String(p.productId) === String(params.productId));
    if (!found) return Promise.reject(new Error('Product not found'));
    return Promise.resolve(found);
  }

  if (action === 'sale-requests') {
    let reqs = getLocalSaleRequests();
    if (params.status && params.status !== 'all') {
      reqs = reqs.filter((r) => String(r.status) === String(params.status));
    }
    if (params.sellerId) {
      reqs = reqs.filter((r) => String(r.sellerId) === String(params.sellerId));
    }
    if (params.buyerId) {
      reqs = reqs.filter((r) => String(r.buyerId) === String(params.buyerId));
    }
    return Promise.resolve(reqs);
  }

  return Promise.resolve([]);
}

function getLocalUsers() {
  try {
    const data = localStorage.getItem('burkit_users');
    const existing = data ? JSON.parse(data) : [];
    const seed = [
      {
        userId: 'USR_ADMIN',
        name: 'Admin User',
        mobile: '9385497906',
        email: 'kpp824762@gmail.com',
        district: 'Tirunelveli',
        area: 'Burkitmanagaram',
        isAdmin: true,
      },
      {
        userId: 'USR_ADMIN_FALLBACK',
        name: 'Admin User',
        mobile: '9999999999',
        email: 'admin@example.com',
        district: 'Tirunelveli',
        area: 'Burkitmanagaram',
        isAdmin: true,
      },
    ];
    const map = new Map();
    seed.forEach((u) => map.set(u.mobile, u));
    existing.forEach((u) => map.set(u.mobile, u));
    const merged = Array.from(map.values());
    localStorage.setItem('burkit_users', JSON.stringify(merged));
    return merged;
  } catch {
    return [];
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem('burkit_users', JSON.stringify(users));
  } catch (e) {
    console.error(e);
  }
}

function localPost(action, body = {}) {
  const shops = getLocalShops();
  const shopProducts = getLocalShopProducts();
  const users = getLocalUsers();

  if (action === 'login') {
    const input = String(body.identifier || body.mobile || body.email || '').trim().toLowerCase();
    const user = users.find((u) => String(u.mobile).trim() === input || String(u.email || '').trim().toLowerCase() === input);
    if (!user) {
      return Promise.reject(new Error(`No registered account found matching "${input}". Please register first.`));
    }
    user.isAdmin = user.mobile === '9385497906' || user.mobile === '9999999999';
    return Promise.resolve(user);
  }

  if (action === 'send-otp') {
    const type = body.type || 'login';
    const targetMobile = String(body.mobile || body.identifier || '').trim();
    const targetEmail = String(body.email || body.identifier || '').trim().toLowerCase();

    if (type === 'register') {
      const existingMobile = users.find((u) => String(u.mobile).trim() === targetMobile);
      if (existingMobile) {
        return Promise.reject(new Error(`This Mobile Number (${targetMobile}) is already registered. Duplicate registration is not allowed. Please login instead.`));
      }
      const existingEmail = users.find((u) => String(u.email || '').trim().toLowerCase() === targetEmail);
      if (existingEmail) {
        return Promise.reject(new Error(`This Email Address (${targetEmail}) is already registered. Duplicate registration is not allowed. Please login instead.`));
      }
      return Promise.resolve({
        sent: true,
        mobile: targetMobile,
        email: targetEmail.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length)),
      });
    } else {
      // Login flow
      const input = String(body.identifier || body.mobile || body.email || '').trim().toLowerCase();
      const foundUser = users.find(
        (u) => String(u.mobile).trim() === input || String(u.email || '').trim().toLowerCase() === input
      );
      if (!foundUser) {
        return Promise.reject(new Error(`No registered account found matching "${input}". Please register first.`));
      }
      return Promise.resolve({
        sent: true,
        mobile: foundUser.mobile,
        email: (foundUser.email || targetEmail).replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length)),
      });
    }
  }

  if (action === 'verify-otp-register') {
    const targetMobile = String(body.mobile || '').trim();
    const targetEmail = String(body.email || '').trim().toLowerCase();

    const existingMobile = users.find((u) => String(u.mobile).trim() === targetMobile);
    if (existingMobile) {
      return Promise.reject(new Error(`This Mobile Number (${targetMobile}) is already registered. Duplicate registration is not allowed.`));
    }
    const existingEmail = users.find((u) => String(u.email || '').trim().toLowerCase() === targetEmail);
    if (existingEmail) {
      return Promise.reject(new Error(`This Email Address (${targetEmail}) is already registered. Duplicate registration is not allowed.`));
    }

    const isAdmin = targetMobile === '9385497906' || targetMobile === '9999999999';
    const newUser = {
      userId: 'USR_' + Date.now(),
      name: body.name,
      mobile: targetMobile,
      email: targetEmail,
      district: body.district || 'Tirunelveli',
      area: body.area || '',
      isAdmin: isAdmin,
    };
    users.push(newUser);
    saveLocalUsers(users);
    return Promise.resolve(newUser);
  }

  if (action === 'verify-otp-login') {
    const input = String(body.identifier || body.mobile || '').trim().toLowerCase();
    const foundUser = users.find(
      (u) => String(u.mobile).trim() === input || String(u.email || '').trim().toLowerCase() === input
    );
    if (!foundUser) {
      return Promise.reject(new Error(`No registered account found matching "${input}". Please register first.`));
    }
    foundUser.isAdmin = foundUser.mobile === '9385497906' || foundUser.mobile === '9999999999';
    return Promise.resolve(foundUser);
  }

  if (action === 'shop-create') {
    const shopId = `SHP_${Date.now()}`;
    const newShop = {
      shopId,
      ownerUserId: body.ownerUserId || 'USR_GUEST',
      ownerName: body.ownerName || 'User',
      shopName: body.shopName,
      whatsappNo: body.whatsappNo,
      shopPhoto: body.shopPhoto || '',
      description: body.description || '',
      villageName: body.villageName || '',
      category: body.category || 'Grocery',
      likeCount: 0,
      status: body.status || 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    shops.unshift(newShop);
    saveLocalShops(shops);

    // If Grocery shop, auto populate default Tamil items into shopProducts!
    if (body.category === 'Grocery' && body.populateDefaults !== false) {
      const defaultProducts = GROCERY_DEFAULT_ITEMS.map((item, idx) => ({
        productId: `SP_${shopId}_${idx + 1}`,
        shopId: shopId,
        productName: item.productName,
        tamilName: item.tamilName,
        subCategory: item.subCategory,
        unitScale: item.defaultScale || '1Kg',
        availableScales: item.availableScales || ['250g', '500g', '1Kg'],
        price: item.price || '40',
        inStock: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const updatedProducts = [...defaultProducts, ...shopProducts];
      saveLocalShopProducts(updatedProducts);
    }

    return Promise.resolve(newShop);
  }

  if (action === 'shop-update') {
    const idx = shops.findIndex((s) => String(s.shopId) === String(body.shopId));
    if (idx === -1) return Promise.reject(new Error('Shop not found'));
    shops[idx] = { ...shops[idx], ...body, updatedAt: new Date().toISOString() };
    saveLocalShops(shops);
    return Promise.resolve(shops[idx]);
  }

  if (action === 'shop-delete') {
    const updated = shops.filter((s) => String(s.shopId) !== String(body.shopId));
    saveLocalShops(updated);
    return Promise.resolve({ deleted: true });
  }

  if (action === 'approve-shop') {
    const idx = shops.findIndex((s) => String(s.shopId) === String(body.shopId));
    if (idx !== -1) {
      shops[idx].status = 'Approved';
      shops[idx].updatedAt = new Date().toISOString();
      saveLocalShops(shops);
    }
    return Promise.resolve(shops[idx]);
  }

  if (action === 'reject-shop') {
    const idx = shops.findIndex((s) => String(s.shopId) === String(body.shopId));
    if (idx !== -1) {
      shops[idx].status = 'Rejected';
      shops[idx].updatedAt = new Date().toISOString();
      saveLocalShops(shops);
    }
    return Promise.resolve(shops[idx]);
  }

  if (action === 'toggle-shop-like') {
    const idx = shops.findIndex((s) => String(s.shopId) === String(body.shopId));
    let liked = true;
    if (idx !== -1) {
      shops[idx].likeCount = Number(shops[idx].likeCount || 0) + 1;
      saveLocalShops(shops);
    }
    return Promise.resolve({ liked: true, likeCount: shops[idx] ? shops[idx].likeCount : 1 });
  }

  if (action === 'shop-product-create') {
    const newItem = {
      productId: `SP_${Date.now()}`,
      shopId: body.shopId,
      productName: body.productName,
      tamilName: body.tamilName || '',
      subCategory: body.subCategory || 'General',
      unitScale: body.unitScale || '1Kg',
      availableScales: body.availableScales || ['250g', '500g', '1Kg'],
      price: body.price || '',
      inStock: body.inStock !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    shopProducts.unshift(newItem);
    saveLocalShopProducts(shopProducts);
    return Promise.resolve(newItem);
  }

  if (action === 'shop-product-update') {
    const idx = shopProducts.findIndex((p) => String(p.productId) === String(body.productId));
    if (idx !== -1) {
      shopProducts[idx] = { ...shopProducts[idx], ...body, updatedAt: new Date().toISOString() };
      saveLocalShopProducts(shopProducts);
    }
    return Promise.resolve(shopProducts[idx]);
  }

  if (action === 'shop-product-delete') {
    const updated = shopProducts.filter((p) => String(p.productId) !== String(body.productId));
    saveLocalShopProducts(updated);
    return Promise.resolve({ deleted: true });
  }

  if (action === 'populate-shop-defaults') {
    const defaultProducts = GROCERY_DEFAULT_ITEMS.map((item, idx) => ({
      productId: `SP_${body.shopId}_${idx + 1}`,
      shopId: body.shopId,
      productName: item.productName,
      tamilName: item.tamilName,
      subCategory: item.subCategory,
      unitScale: item.defaultScale || '1Kg',
      availableScales: item.availableScales || ['250g', '500g', '1Kg'],
      price: item.price || '40',
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const updatedProducts = [...defaultProducts, ...shopProducts];
    saveLocalShopProducts(updatedProducts);
    return Promise.resolve(defaultProducts);
  }

  if (action === 'product' || action === 'product-create') {
    const products = getLocalProducts();
    const productId = `PRD_${Date.now()}`;
    const newProduct = {
      productId,
      sellerId: body.sellerId || 'USR_GUEST',
      sellerName: body.sellerName || 'Seller',
      sellerMobile: body.sellerMobile || '',
      category: body.category || '',
      productName: body.productName || '',
      description: body.description || '',
      price: body.price || '',
      negotiable: body.negotiable || 'No',
      imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls.join(',') : (body.imageUrls || ''),
      district: body.district || 'Tirunelveli',
      area: body.area || '',
      likeCount: 0,
      status: body.status || 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.unshift(newProduct);
    saveLocalProducts(products);
    return Promise.resolve(newProduct);
  }

  if (action === 'product-update') {
    const products = getLocalProducts();
    const idx = products.findIndex((p) => String(p.productId) === String(body.productId));
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...body, updatedAt: new Date().toISOString() };
      saveLocalProducts(products);
    }
    return Promise.resolve(products[idx]);
  }

  if (action === 'product-delete') {
    const products = getLocalProducts();
    const updated = products.filter((p) => String(p.productId) !== String(body.productId));
    saveLocalProducts(updated);
    return Promise.resolve({ deleted: true });
  }

  if (action === 'approve-product') {
    const products = getLocalProducts();
    const idx = products.findIndex((p) => String(p.productId) === String(body.productId));
    if (idx !== -1) {
      products[idx].status = 'Approved';
      products[idx].updatedAt = new Date().toISOString();
      saveLocalProducts(products);
    }
    return Promise.resolve(products[idx] || {});
  }

  if (action === 'reject-product') {
    const products = getLocalProducts();
    const idx = products.findIndex((p) => String(p.productId) === String(body.productId));
    if (idx !== -1) {
      products[idx].status = 'Rejected';
      products[idx].updatedAt = new Date().toISOString();
      saveLocalProducts(products);
    }
    return Promise.resolve(products[idx] || {});
  }

  if (action === 'sale-request-create' || action === 'sale-request') {
    const reqs = getLocalSaleRequests();
    const newReq = {
      requestId: `REQ_${Date.now()}`,
      productId: body.productId,
      productName: body.productName || '',
      sellerId: body.sellerId || '',
      sellerName: body.sellerName || '',
      sellerMobile: body.sellerMobile || '',
      buyerId: body.buyerId || '',
      buyerName: body.buyerName || '',
      buyerMobile: body.buyerMobile || '',
      message: body.message || '',
      status: body.status || 'New',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reqs.unshift(newReq);
    saveLocalSaleRequests(reqs);
    return Promise.resolve(newReq);
  }

  if (action === 'sale-request-status') {
    const reqs = getLocalSaleRequests();
    const idx = reqs.findIndex((r) => String(r.requestId) === String(body.requestId));
    if (idx !== -1) {
      reqs[idx].status = body.status;
      reqs[idx].updatedAt = new Date().toISOString();
      saveLocalSaleRequests(reqs);
    }
    return Promise.resolve(reqs[idx] || {});
  }

  if (action === 'sale-request-delete') {
    const reqs = getLocalSaleRequests();
    const updated = reqs.filter((r) => String(r.requestId) !== String(body.requestId));
    saveLocalSaleRequests(updated);
    return Promise.resolve({ deleted: true });
  }

  return Promise.resolve({});
}

export const api = {
  // Auth
  login: (mobile) => post('login', { mobile }),
  register: (payload) => post('register', payload),
  sendOtp: (payload) => post('send-otp', payload),
  verifyOtpRegister: (payload) => post('verify-otp-register', payload),
  verifyOtpLogin: (payload) => post('verify-otp-login', payload),

  // Users
  getUser: (userId) => get('user', { userId }),
  updateUser: (payload) => post('user', payload),

  // Products
  getProducts: (params) => get('products', params),
  getProduct: (productId) => get('product', { productId }),
  createProduct: (payload) => post('product', payload),
  updateProduct: (payload) => post('product-update', payload),
  deleteProduct: (productId) => post('product-delete', { productId }),

  // Categories
  getCategories: (params) => get('categories', params),
  getCategory: (categoryId) => get('category', { categoryId }),
  createCategory: (payload) => post('category-create', payload),
  updateCategory: (payload) => post('category-update', payload),
  deleteCategory: (categoryId) => post('category-delete', { categoryId }),
  toggleCategoryStatus: (categoryId, status) => post('category-status', { categoryId, status }),

  // Admin Products
  getPendingProducts: () => get('pending-products'),
  approveProduct: (productId) => post('approve-product', { productId }),
  rejectProduct: (productId) => post('reject-product', { productId }),

  // Shops API
  getShops: (params) => get('shops', params),
  getShop: (shopId) => get('shop', { shopId }),
  createShop: async (payload) => {
    const shop = await post('shop-create', payload);
    if (payload.category === 'Grocery' && payload.populateDefaults !== false && shop && shop.shopId) {
      try {
        await api.populateShopDefaults(shop.shopId);
      } catch (err) {
        console.warn('Auto populate shop defaults warning:', err);
      }
    }
    return shop;
  },
  updateShop: (payload) => post('shop-update', payload),
  deleteShop: (shopId) => post('shop-delete', { shopId }),
  approveShop: (shopId) => post('approve-shop', { shopId }),
  rejectShop: (shopId) => post('reject-shop', { shopId }),
  toggleShopLike: (shopId, userId) => post('toggle-shop-like', { shopId, userId }),

  // Shop Products API
  getShopProducts: (params) => get('shop-products', params),
  createShopProduct: (payload) => post('shop-product-create', payload),
  updateShopProduct: (payload) => post('shop-product-update', payload),
  deleteShopProduct: (productId) => post('shop-product-delete', { productId }),
  populateShopDefaults: async (shopId) => {
    try {
      return await post('populate-shop-defaults', { shopId });
    } catch (err) {
      console.warn('Backend action populate-shop-defaults unavailable or failed, running client fallback:', err.message);
      // Fallback: create default items locally / item-by-item so shop is populated!
      const items = GROCERY_DEFAULT_ITEMS;
      const created = [];
      for (const item of items) {
        try {
          const res = await api.createShopProduct({
            shopId: shopId,
            productName: item.productName,
            tamilName: item.tamilName,
            subCategory: item.subCategory,
            unitScale: item.defaultScale || '1Kg',
            availableScales: Array.isArray(item.availableScales) ? item.availableScales.join(',') : (item.availableScales || '250g,500g,1Kg'),
            price: item.price || '40',
            inStock: true,
          });
          created.push(res);
        } catch (e) {
          console.error('Error creating product item fallback:', e);
        }
      }
      return created;
    }
  },

  // Sale Requests
  createSaleRequest: (payload) => post('sale-request-create', payload),
  getSaleRequests: (params) => get('sale-requests', params),
  getSaleRequest: (requestId) => get('sale-request', { requestId }),
  updateSaleRequestStatus: (requestId, status, productId) => post('sale-request-status', { requestId, status, productId }),
  deleteSaleRequest: (requestId) => post('sale-request-delete', { requestId }),

  // Upload
  uploadImage: (payload) => post('upload-image', payload),

  // Product Likes
  toggleLike: (productId, userId) => post('toggle-like', { productId, userId }),
  getUserLikes: (userId) => get('user-likes', { userId }),
};

export default api;
