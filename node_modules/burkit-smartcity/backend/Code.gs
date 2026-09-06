/**
 * BURKIT SMARTCITY - Backend API
 * Google Apps Script + Google Sheets + Google Drive
 *
 * SETUP:
 * 1. Create a new Google Sheet. Note its ID (from the URL).
 * 2. Extensions -> Apps Script. Paste this file in as Code.gs.
 * 3. Update SHEET_ID below with your Sheet ID.
 * 4. Run `setup()` once from the Apps Script editor to create sheets,
 *    headers, seed categories, and the two Drive folders.
 * 5. Deploy -> New deployment -> Type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the deployed Web App URL into the frontend .env as VITE_API_URL.
 */

// ==================== CONFIG ====================

// No SHEET_ID needed; script will use the active spreadsheet
const IMAGE_FOLDER_NAME = 'myshop';

const SHEETS = {
  USERS: 'Users',
  PRODUCTS: 'Products',
  CATEGORIES: 'Categories',
  REPORTS: 'Reports',
  SALE_REQUESTS: 'SaleRequests',
  PRODUCT_LIKES: 'ProductLikes',
  SHOPS: 'Shops',
  SHOP_PRODUCTS: 'ShopProducts',
  OTP_STORE: 'OTPStore',
};

const HEADERS = {
  Users: ['userId', 'name', 'mobile', 'email', 'district', 'area', 'profileImage', 'createdAt'],
  Products: [
    'productId', 'sellerId', 'sellerName', 'sellerMobile', 'category',
    'productName', 'description', 'price', 'negotiable', 'imageUrls',
    'district', 'area', 'latitude', 'longitude', 'deliveryAvailable', 'deliveryFeePerKm', 'likeCount', 'status', 'createdAt', 'updatedAt',
  ],
  Categories: ['categoryId', 'categoryName', 'categoryIcon', 'description', 'displayOrder', 'status', 'createdAt', 'updatedAt'],
  Reports: ['reportId', 'productId', 'reportedBy', 'reason', 'createdAt'],
  SaleRequests: [
    'requestId', 'productId', 'productName', 'sellerId', 'sellerName', 'sellerMobile',
    'buyerId', 'buyerName', 'buyerMobile', 'message', 'status', 'createdAt', 'updatedAt'
  ],
  ProductLikes: ['likeId', 'productId', 'userId', 'createdAt'],
  Shops: ['shopId', 'ownerUserId', 'ownerName', 'shopName', 'whatsappNo', 'shopPhoto', 'description', 'villageName', 'category', 'likeCount', 'status', 'createdAt', 'updatedAt'],
  ShopProducts: ['productId', 'shopId', 'productName', 'tamilName', 'subCategory', 'unitScale', 'availableScales', 'price', 'inStock', 'createdAt', 'updatedAt'],
  OTPStore: ['otpId', 'mobile', 'email', 'otpCode', 'expiresAt', 'type', 'createdAt'],
};

const PRODUCT_STATUS = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', SOLD: 'Sold' };

// Simple admin gate. Replace with real auth for production use.
const ADMIN_MOBILE_NUMBERS = ['9385497906', '9999999999'];

// ==================== ONE-TIME SETUP ====================

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.clear();
    sheet.appendRow(HEADERS[name]);
    sheet.setFrozenRows(1);
  });

  // Remove default "Sheet1" if present and empty
  const def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  // Seed categories
  const cat = ss.getSheetByName(SHEETS.CATEGORIES);
  const now = new Date().toISOString();
  const seed = [
    ['CAT001', 'Electronics', 'smartphone', 'Gadgets and electronic items', 1, 'Active', now, now],
    ['CAT002', 'Vehicles', 'car', 'Cars, bikes and motor vehicles', 2, 'Active', now, now],
    ['CAT003', 'Furniture', 'sofa', 'Home and office furniture', 3, 'Active', now, now],
    ['CAT004', 'Fashion', 'shirt', 'Clothing and fashion accessories', 4, 'Active', now, now],
    ['CAT005', 'Home & Kitchen', 'utensils', 'Kitchenware and appliances', 5, 'Active', now, now],
    ['CAT006', 'Real Estate', 'home', 'Properties, plots and rentals', 6, 'Active', now, now],
    ['CAT007', 'Jobs', 'briefcase', 'Local job openings', 7, 'Active', now, now],
    ['CAT008', 'Services', 'wrench', 'Local services and repairs', 8, 'Active', now, now],
    ['CAT009', 'Agriculture', 'leaf', 'Farming tools and produce', 9, 'Active', now, now],
    ['CAT010', 'Others', 'grid', 'Miscellaneous items', 10, 'Active', now, now],
  ];
  seed.forEach(function (row) { cat.appendRow(row); });

  // Drive folders
  getOrCreateFolder(IMAGE_FOLDER_NAME);

  Logger.log('Setup complete.');
}

function getOrCreateFolder(name) {
  const it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

// ==================== ENTRY POINTS ====================

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    const action = (e.parameter.action || '').toLowerCase();
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};

    let result;
    if (method === 'GET') {
      if (action === 'users') result = listUsers();
      else if (action === 'user') result = getUser(e.parameter.userId);
      else if (action === 'products') result = listProducts(e.parameter);
      else if (action === 'product') result = getProduct(e.parameter.productId);
      else if (action === 'categories') result = listCategories(e.parameter);
      else if (action === 'category') result = getCategory(e.parameter.categoryId);
      else if (action === 'pending-products') result = listPendingProducts();
      else if (action === 'sale-requests') result = listSaleRequests(e.parameter);
      else if (action === 'sale-request') result = getSaleRequest(e.parameter.requestId);
      else if (action === 'user-likes') result = getUserLikes(e.parameter);
      else if (action === 'shops') result = listShops(e.parameter);
      else if (action === 'shop') result = getShop(e.parameter.shopId);
      else if (action === 'shop-products') result = listShopProducts(e.parameter);
      else throw new Error('Unknown GET action: ' + action);
    } else {
      if (action === 'login') result = login(body);
      else if (action === 'register') result = register(body);
      else if (action === 'user') result = updateUser(body);
      else if (action === 'product') result = createProduct(body);
      else if (action === 'product-update') result = updateProduct(body);
      else if (action === 'product-delete') result = deleteProduct(body);
      else if (action === 'approve-product') result = approveProduct(body);
      else if (action === 'reject-product') result = rejectProduct(body);
      else if (action === 'upload-image') result = uploadImage(body);
      else if (action === 'report') result = reportProduct(body);
      else if (action === 'category-create' || action === 'category') result = createCategory(body);
      else if (action === 'category-update') result = updateCategory(body);
      else if (action === 'category-delete') result = deleteCategory(body);
      else if (action === 'category-status') result = toggleCategoryStatus(body);
      else if (action === 'sale-request-create' || action === 'sale-request') result = createSaleRequest(body);
      else if (action === 'sale-request-status') result = updateSaleRequestStatus(body);
      else if (action === 'sale-request-delete') result = deleteSaleRequest(body);
      else if (action === 'toggle-like') result = toggleLikeProduct(body);
      else if (action === 'shop-create' || action === 'shop') result = createShop(body);
      else if (action === 'shop-update') result = updateShop(body);
      else if (action === 'shop-delete') result = deleteShop(body);
      else if (action === 'approve-shop') result = approveShop(body);
      else if (action === 'reject-shop') result = rejectShop(body);
      else if (action === 'toggle-shop-like') result = toggleShopLike(body);
      else if (action === 'shop-product-create') result = createShopProduct(body);
      else if (action === 'shop-product-update') result = updateShopProduct(body);
      else if (action === 'shop-product-delete') result = deleteShopProduct(body);
      else if (action === 'populate-shop-defaults') result = populateShopDefaults(body);
      else if (action === 'send-otp') result = sendOtp(body);
      else if (action === 'verify-otp-register') result = verifyOtpRegister(body);
      else if (action === 'verify-otp-login') result = verifyOtpLogin(body);
      else throw new Error('Unknown POST action: ' + action);
    }
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== SHEET HELPERS ====================

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (HEADERS[name]) {
      sheet.appendRow(HEADERS[name]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function sheetToObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) return [];
  const headers = values[0];
  const rows = values.slice(1);
  return rows
    .filter(function (r) { return r.join('') !== ''; })
    .map(function (r) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = r[i]; });
      return obj;
    });
}

function appendRowFromObject(sheetName, obj) {
  const sheet = getSheet(sheetName);
  const headers = HEADERS[sheetName];
  const row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function findRowIndexById(sheetName, idField, idValue) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf(idField);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(idValue)) return { rowIndex: i + 1, headers: headers, row: values[i] };
  }
  return null;
}

function updateRowById(sheetName, idField, idValue, patch) {
  const sheet = getSheet(sheetName);
  const found = findRowIndexById(sheetName, idField, idValue);
  if (!found) throw new Error('Record not found: ' + idValue);
  const headers = found.headers;
  headers.forEach(function (h, i) {
    if (patch[h] !== undefined) {
      sheet.getRange(found.rowIndex, i + 1).setValue(patch[h]);
    }
  });
  return true;
}

function deleteRowById(sheetName, idField, idValue) {
  const found = findRowIndexById(sheetName, idField, idValue);
  if (!found) throw new Error('Record not found: ' + idValue);
  getSheet(sheetName).deleteRow(found.rowIndex);
  return true;
}

function generateId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
}

// ==================== AUTH ====================

function register(body) {
  const mobile = String(body.mobile || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  if (!mobile) throw new Error('Mobile number is required');
  if (!email) throw new Error('Email address is required');

  const users = sheetToObjects(SHEETS.USERS);
  const existingMobile = users.find(function (u) { return String(u.mobile).trim() === mobile; });
  if (existingMobile) throw new Error('This Mobile Number (' + mobile + ') is already registered. Duplicate registration is not allowed. Please login instead.');

  const existingEmail = users.find(function (u) { return String(u.email || '').trim().toLowerCase() === email; });
  if (existingEmail) throw new Error('This Email Address (' + email + ') is already registered. Duplicate registration is not allowed. Please login instead.');

  const userId = generateId('USR');
  const newUser = {
    userId: userId,
    name: body.name || '',
    mobile: mobile,
    email: email,
    district: body.district || 'Tirunelveli',
    area: body.area || '',
    profileImage: body.profileImage || '',
    createdAt: new Date().toISOString(),
  };
  newUser.isAdmin = ADMIN_MOBILE_NUMBERS.indexOf(mobile) !== -1;
  appendRowFromObject(SHEETS.USERS, newUser);
  return newUser;
}

function login(body) {
  const input = String(body.identifier || body.mobile || body.email || '').trim().toLowerCase();
  if (!input) throw new Error('Mobile number or email address is required for login');

  const users = sheetToObjects(SHEETS.USERS);
  const user = users.find(function (u) {
    return String(u.mobile).trim() === input || String(u.email || '').trim().toLowerCase() === input;
  });
  if (!user) throw new Error('No registered account found matching "' + input + '". Unregistered users cannot log in. Please register first.');

  user.isAdmin = ADMIN_MOBILE_NUMBERS.indexOf(String(user.mobile)) !== -1;
  return user;
}

// ==================== USERS ====================

function listUsers() {
  return sheetToObjects(SHEETS.USERS);
}

function getUser(userId) {
  const users = sheetToObjects(SHEETS.USERS);
  const user = users.find(function (u) { return String(u.userId) === String(userId); });
  if (!user) throw new Error('User not found');
  return user;
}

function updateUser(body) {
  if (!body.userId) throw new Error('userId is required');
  updateRowById(SHEETS.USERS, 'userId', body.userId, body);
  return getUser(body.userId);
}

// ==================== PRODUCTS ====================

function listProducts(params) {
  params = params || {};
  let products = sheetToObjects(SHEETS.PRODUCTS);

  // If sellerId is provided or status is explicitly 'all', don't filter by status by default
  let status = params.status;
  if (!status) {
    status = params.sellerId ? 'all' : PRODUCT_STATUS.APPROVED;
  }

  if (status !== 'all') {
    products = products.filter(function (p) { return p.status === status; });
  }
  if (params.category) {
    products = products.filter(function (p) { return p.category === params.category; });
  }
  if (params.district) {
    products = products.filter(function (p) { return p.district === params.district; });
  }
  if (params.sellerId) {
    products = products.filter(function (p) { return String(p.sellerId) === String(params.sellerId); });
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    products = products.filter(function (p) {
      return String(p.productName).toLowerCase().indexOf(q) !== -1 ||
        String(p.description).toLowerCase().indexOf(q) !== -1;
    });
  }

  if (params.sortBy === 'popular') {
    products.sort(function (a, b) { return Number(b.likeCount || 0) - Number(a.likeCount || 0); });
  } else {
    products.sort(function (a, b) { return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt); });
  }
  return products;
}

function toggleLikeProduct(body) {
  if (!body.productId || !body.userId) throw new Error('productId and userId are required');

  const likes = sheetToObjects(SHEETS.PRODUCT_LIKES);
  const existing = likes.find(function (l) {
    return String(l.productId) === String(body.productId) && String(l.userId) === String(body.userId);
  });

  const product = getProduct(body.productId);
  let currentLikes = Number(product.likeCount || 0);

  if (existing) {
    // Already liked -> remove like (Unlike)
    deleteRowById(SHEETS.PRODUCT_LIKES, 'likeId', existing.likeId);
    currentLikes = Math.max(0, currentLikes - 1);
    updateRowById(SHEETS.PRODUCTS, 'productId', body.productId, { likeCount: currentLikes });
    return { liked: false, likeCount: currentLikes };
  } else {
    // Not liked -> add like
    const likeId = generateId('LIK');
    const newLike = {
      likeId: likeId,
      productId: body.productId,
      userId: body.userId,
      createdAt: new Date().toISOString(),
    };
    appendRowFromObject(SHEETS.PRODUCT_LIKES, newLike);
    currentLikes = currentLikes + 1;
    updateRowById(SHEETS.PRODUCTS, 'productId', body.productId, { likeCount: currentLikes });
    return { liked: true, likeCount: currentLikes };
  }
}

function getUserLikes(params) {
  params = params || {};
  if (!params.userId) return [];
  const likes = sheetToObjects(SHEETS.PRODUCT_LIKES);
  return likes
    .filter(function (l) { return String(l.userId) === String(params.userId); })
    .map(function (l) { return String(l.productId); });
}

function listPendingProducts() {
  return sheetToObjects(SHEETS.PRODUCTS).filter(function (p) { return p.status === PRODUCT_STATUS.PENDING; });
}

function getProduct(productId) {
  const products = sheetToObjects(SHEETS.PRODUCTS);
  const product = products.find(function (p) { return String(p.productId) === String(productId); });
  if (!product) throw new Error('Product not found');
  return product;
}

function createProduct(body) {
  const required = ['sellerId', 'productName', 'category', 'sellerMobile', 'district'];
  required.forEach(function (f) {
    if (!body[f]) throw new Error('Missing required field: ' + f);
  });

  const productId = generateId('PRD');
  const now = new Date().toISOString();
  const newProduct = {
    productId: productId,
    sellerId: body.sellerId,
    sellerName: body.sellerName || '',
    sellerMobile: body.sellerMobile,
    category: body.category,
    productName: body.productName,
    description: body.description || '',
    price: body.price || '',
    negotiable: body.negotiable || 'No',
    imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls.join(',') : (body.imageUrls || ''),
    district: body.district,
    area: body.area || '',
    latitude: body.latitude || '',
    longitude: body.longitude || '',
    deliveryAvailable: body.deliveryAvailable || 'No',
    deliveryFeePerKm: body.deliveryAvailable === 'Yes' ? (body.deliveryFeePerKm || '0') : '',
    likeCount: 0,
    status: PRODUCT_STATUS.PENDING,
    createdAt: now,
    updatedAt: now,
  };
  appendRowFromObject(SHEETS.PRODUCTS, newProduct);
  return newProduct;
}

function updateProduct(body) {
  if (!body.productId) throw new Error('productId is required');
  const patch = Object.assign({}, body);
  patch.updatedAt = new Date().toISOString();
  if (Array.isArray(patch.imageUrls)) patch.imageUrls = patch.imageUrls.join(',');
  updateRowById(SHEETS.PRODUCTS, 'productId', body.productId, patch);
  return getProduct(body.productId);
}

function deleteShopProduct(body) {
  if (!body.productId) throw new Error('productId is required');
  deleteRowById(SHEETS.SHOP_PRODUCTS, 'productId', body.productId);
  return { deleted: true };
}

// ==================== OTP AUTHENTICATION ====================

function sendOtp(body) {
  const type = body.type || 'login'; // 'register' | 'login'
  const users = sheetToObjects(SHEETS.USERS);
  
  let userEmail = body.email || '';
  let userName = body.name || 'User';
  let targetMobile = body.mobile || '';

  if (type === 'register') {
    targetMobile = String(body.mobile || '').trim();
    userEmail = String(body.email || '').trim().toLowerCase();
    if (!targetMobile) throw new Error('Mobile number is required for registration');
    if (!userEmail) throw new Error('Email address is required for registration');

    const existingMobile = users.find(function (u) { return String(u.mobile).trim() === targetMobile; });
    if (existingMobile) throw new Error('This Mobile Number (' + targetMobile + ') is already registered. Duplicate registration is not allowed.');

    const existingEmail = users.find(function (u) { return String(u.email || '').trim().toLowerCase() === userEmail; });
    if (existingEmail) throw new Error('This Email Address (' + userEmail + ') is already registered. Duplicate registration is not allowed.');
  } else {
    // Login flow - accept mobile number OR email address!
    const input = String(body.identifier || body.mobile || body.email || '').trim().toLowerCase();
    if (!input) throw new Error('Mobile number or email address is required for login');

    const foundUser = users.find(function (u) {
      return String(u.mobile).trim() === input || String(u.email || '').trim().toLowerCase() === input;
    });

    if (!foundUser) {
      throw new Error('No account found for "' + input + '". Duplicate or unregistered accounts cannot log in. Please register first.');
    }
    targetMobile = foundUser.mobile || '';
    userEmail = foundUser.email || '';
    userName = foundUser.name || 'User';
    if (!userEmail) throw new Error('No email address associated with this account. Please contact support.');
  }

  // Generate 6-digit OTP code
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 min validity

  const newOtpRecord = {
    otpId: generateId('OTP'),
    mobile: targetMobile,
    email: userEmail,
    otpCode: otpCode,
    expiresAt: expiresAt,
    type: type,
    createdAt: now.toISOString(),
  };

  appendRowFromObject(SHEETS.OTP_STORE, newOtpRecord);

  // Send HTML Email using Google Apps Script MailApp
  try {
    MailApp.sendEmail({
      to: userEmail,
      subject: 'BurKIt SmartCity - Your Authentication OTP Code: ' + otpCode,
      htmlBody:
        '<div style="font-family: Arial, sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; background-color: #fff7ed; border-radius: 16px; border: 1px solid #fed7aa;">' +
        '<div style="text-align: center; margin-bottom: 20px;">' +
        '<h1 style="color: #ea580c; margin: 0; font-size: 24px;">BurKIt Smartcity</h1>' +
        '<p style="color: #9a3412; font-size: 13px; margin-top: 4px;">Burkitmanagaram Nearby Areas Service</p>' +
        '</div>' +
        '<div style="background-color: #ffffff; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center;">' +
        '<p style="color: #27272a; font-size: 14px; margin-bottom: 8px;">வணக்கம் <b>' + userName + '</b>,</p>' +
        '<p style="color: #52525b; font-size: 13px; margin: 0;">உங்கள் சரிபார்ப்பு குறியீடு (Your Verification OTP Code):</p>' +
        '<h2 style="font-size: 36px; letter-spacing: 8px; color: #ea580c; background-color: #fff7ed; padding: 12px; margin: 16px 0; border-radius: 8px; border: 1px dashed #fb923c;">' + otpCode + '</h2>' +
        '<p style="color: #71717a; font-size: 12px; margin: 0;">இந்த OTP 10 நிமிடங்கள் மட்டுமே செல்லும் (Valid for 10 minutes).</p>' +
        '</div>' +
        '<p style="color: #a1a1aa; font-size: 11px; text-align: center; margin-top: 20px;">If you did not request this OTP, please ignore this email.</p>' +
        '</div>',
    });
  } catch (mailErr) {
    Logger.log('MailApp sendEmail error: ' + mailErr.message);
  }

  return {
    sent: true,
    mobile: targetMobile,
    email: maskEmail(userEmail),
  };
}

function verifyOtpRegister(body) {
  if (!body.mobile || !body.otpCode || !body.email || !body.name) {
    throw new Error('Name, mobile, email, and OTP code are required');
  }

  const otps = sheetToObjects(SHEETS.OTP_STORE);
  const matching = otps.filter(function (o) {
    return String(o.mobile) === String(body.mobile) && o.type === 'register';
  });

  if (matching.length === 0) throw new Error('No OTP request found for this mobile number. Please request OTP again.');

  const latestOtp = matching[matching.length - 1];
  const nowIso = new Date().toISOString();

  if (nowIso > latestOtp.expiresAt) throw new Error('OTP code has expired. Please request a new OTP.');
  if (String(latestOtp.otpCode).trim() !== String(body.otpCode).trim()) {
    throw new Error('Invalid OTP code. Please check your email and try again.');
  }

  // OTP verified! Create user in Users sheet
  return register({
    name: body.name,
    mobile: body.mobile,
    email: body.email,
    district: body.district || 'Tirunelveli',
    area: body.area || '',
    profileImage: body.profileImage || '',
  });
}

function verifyOtpLogin(body) {
  if (!body.mobile || !body.otpCode) {
    throw new Error('Mobile number and OTP code are required');
  }

  const otps = sheetToObjects(SHEETS.OTP_STORE);
  const matching = otps.filter(function (o) {
    return String(o.mobile) === String(body.mobile) && o.type === 'login';
  });

  if (matching.length === 0) throw new Error('No OTP request found for this mobile number. Please request OTP again.');

  const latestOtp = matching[matching.length - 1];
  const nowIso = new Date().toISOString();

  if (nowIso > latestOtp.expiresAt) throw new Error('OTP code has expired. Please request a new OTP.');
  if (String(latestOtp.otpCode).trim() !== String(body.otpCode).trim()) {
    throw new Error('Invalid OTP code. Please check your email and try again.');
  }

  // OTP verified! Login user
  return login({ mobile: body.mobile });
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const parts = email.split('@');
  const user = parts[0];
  const domain = parts[1];
  if (user.length <= 2) return user.charAt(0) + '*@' + domain;
  return user.charAt(0) + '***' + user.charAt(user.length - 1) + '@' + domain;
}


// ==================== CATEGORIES ====================

function listCategories(params) {
  params = params || {};
  let cats = sheetToObjects(SHEETS.CATEGORIES);

  // Count total products per category
  const products = sheetToObjects(SHEETS.PRODUCTS);
  const counts = {};
  products.forEach(function (p) {
    if (p.category) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
  });

  cats = cats.map(function (c) {
    c.totalProducts = counts[c.categoryName] || 0;
    c.categoryIcon = c.categoryIcon || c.icon || 'grid';
    return c;
  });

  // Regular user view returns only Active categories unless all=true parameter is passed
  if (params.all !== 'true') {
    cats = cats.filter(function (c) { return c.status === 'Active'; });
  }

  cats.sort(function (a, b) {
    const orderA = Number(a.displayOrder) || 999;
    const orderB = Number(b.displayOrder) || 999;
    return orderA - orderB;
  });

  return cats;
}

function getCategory(categoryId) {
  const cats = listCategories({ all: 'true' });
  const cat = cats.find(function (c) { return String(c.categoryId) === String(categoryId); });
  if (!cat) throw new Error('Category not found');
  return cat;
}

function createCategory(body) {
  if (!body.categoryName) throw new Error('categoryName is required');
  const now = new Date().toISOString();
  const categoryId = generateId('CAT');
  const newCat = {
    categoryId: categoryId,
    categoryName: body.categoryName,
    categoryIcon: body.categoryIcon || body.icon || 'grid',
    description: body.description || '',
    displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : 99,
    status: body.status || 'Active',
    createdAt: now,
    updatedAt: now,
  };
  appendRowFromObject(SHEETS.CATEGORIES, newCat);
  return getCategory(categoryId);
}

function updateCategory(body) {
  if (!body.categoryId) throw new Error('categoryId is required');
  const patch = Object.assign({}, body);
  patch.updatedAt = new Date().toISOString();
  if (patch.icon && !patch.categoryIcon) patch.categoryIcon = patch.icon;
  if (patch.displayOrder !== undefined) patch.displayOrder = Number(patch.displayOrder);
  updateRowById(SHEETS.CATEGORIES, 'categoryId', body.categoryId, patch);
  return getCategory(body.categoryId);
}

function deleteCategory(body) {
  if (!body.categoryId) throw new Error('categoryId is required');
  const target = getCategory(body.categoryId);
  if (!target) throw new Error('Category not found');

  // Check if products exist under this category
  const products = sheetToObjects(SHEETS.PRODUCTS);
  const count = products.filter(function (p) {
    return String(p.category || '').trim().toLowerCase() === String(target.categoryName || '').trim().toLowerCase();
  }).length;

  if (count > 0) {
    throw new Error('This category contains products. Move the products to another category or delete them first.');
  }

  deleteRowById(SHEETS.CATEGORIES, 'categoryId', body.categoryId);
  return { deleted: true };
}

function toggleCategoryStatus(body) {
  if (!body.categoryId) throw new Error('categoryId is required');
  const target = getCategory(body.categoryId);
  const newStatus = body.status ? body.status : (target.status === 'Active' ? 'Inactive' : 'Active');
  return updateCategory({ categoryId: body.categoryId, status: newStatus });
}

// ==================== ADMIN ====================

function approveProduct(body) {
  if (!body.productId) throw new Error('productId is required');
  updateRowById(SHEETS.PRODUCTS, 'productId', body.productId, { status: PRODUCT_STATUS.APPROVED });
  return getProduct(body.productId);
}

function rejectProduct(body) {
  if (!body.productId) throw new Error('productId is required');
  updateRowById(SHEETS.PRODUCTS, 'productId', body.productId, { status: PRODUCT_STATUS.REJECTED });
  return getProduct(body.productId);
}

// ==================== REPORTS ====================

function reportProduct(body) {
  if (!body.productId || !body.reason) throw new Error('productId and reason are required');
  const report = {
    reportId: generateId('RPT'),
    productId: body.productId,
    reportedBy: body.reportedBy || '',
    reason: body.reason,
    createdAt: new Date().toISOString(),
  };
  appendRowFromObject(SHEETS.REPORTS, report);
  return report;
}

// ==================== IMAGE UPLOAD (Google Drive) ====================
// body: { base64: '...', fileName: 'x.jpg', mimeType: 'image/jpeg', type: 'product' | 'profile' }

function uploadImage(body) {
  if (!body.base64) throw new Error('base64 image data is required');
  const folderName = IMAGE_FOLDER_NAME;
  const folder = getOrCreateFolder(folderName);

  const contentType = body.mimeType || 'image/jpeg';
  const base64Data = body.base64.indexOf(',') !== -1 ? body.base64.split(',')[1] : body.base64;
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, contentType, body.fileName || ('image_' + new Date().getTime() + '.jpg'));

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Direct-viewable image URL
  const url = 'https://lh3.googleusercontent.com/d/' + file.getId();
  return { fileId: file.getId(), url: url };
}

// ==================== SALE REQUESTS ====================

function listSaleRequests(params) {
  params = params || {};
  let reqs = sheetToObjects(SHEETS.SALE_REQUESTS);

  if (params.buyerId) {
    reqs = reqs.filter(function (r) { return String(r.buyerId) === String(params.buyerId); });
  }
  if (params.sellerId) {
    reqs = reqs.filter(function (r) { return String(r.sellerId) === String(params.sellerId); });
  }
  if (params.status && params.status !== 'all') {
    reqs = reqs.filter(function (r) { return String(r.status) === String(params.status); });
  }

  reqs.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return reqs;
}

function getSaleRequest(requestId) {
  const reqs = sheetToObjects(SHEETS.SALE_REQUESTS);
  const found = reqs.find(function (r) { return String(r.requestId) === String(requestId); });
  if (!found) throw new Error('Sale request not found');
  return found;
}

function createSaleRequest(body) {
  if (!body.productId || !body.buyerMobile) throw new Error('productId and buyerMobile are required');

  const requestId = generateId('REQ');
  const now = new Date().toISOString();
  const newReq = {
    requestId: requestId,
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
    createdAt: now,
    updatedAt: now,
  };
  appendRowFromObject(SHEETS.SALE_REQUESTS, newReq);
  return newReq;
}

function updateSaleRequestStatus(body) {
  if (!body.requestId || !body.status) throw new Error('requestId and status are required');
  updateRowById(SHEETS.SALE_REQUESTS, 'requestId', body.requestId, {
    status: body.status,
    updatedAt: new Date().toISOString(),
  });

  // If marked as Sold, optionally update product status to Sold as well
  if (body.status === 'Sold' && body.productId) {
    try {
      updateRowById(SHEETS.PRODUCTS, 'productId', body.productId, { status: PRODUCT_STATUS.SOLD });
    } catch (e) {
      // product might have been deleted or already updated
    }
  }

  return getSaleRequest(body.requestId);
}

function deleteSaleRequest(body) {
  if (!body.requestId) throw new Error('requestId is required');
  deleteRowById(SHEETS.SALE_REQUESTS, 'requestId', body.requestId);
  return { deleted: true };
}

// ==================== SHOPS & SHOP PRODUCTS ====================

function listShops(params) {
  params = params || {};
  let shops = sheetToObjects(SHEETS.SHOPS);
  if (params.status && params.status !== 'all') {
    shops = shops.filter(function (s) { return s.status === params.status; });
  } else if (!params.status) {
    shops = shops.filter(function (s) { return s.status === 'Approved'; });
  }
  if (params.category && params.category !== 'All') {
    shops = shops.filter(function (s) { return String(s.category).toLowerCase() === String(params.category).toLowerCase(); });
  }
  if (params.ownerUserId) {
    shops = shops.filter(function (s) { return String(s.ownerUserId) === String(params.ownerUserId); });
  }
  return shops;
}

function getShop(shopId) {
  const shops = sheetToObjects(SHEETS.SHOPS);
  const found = shops.find(function (s) { return String(s.shopId) === String(shopId); });
  if (!found) throw new Error('Shop not found');
  return found;
}

function createShop(body) {
  if (!body.shopName || !body.whatsappNo) throw new Error('Shop name and WhatsApp number are required');
  const shopId = generateId('SHP');
  const now = new Date().toISOString();

  let photoUrl = body.shopPhoto || '';
  if (photoUrl && photoUrl.indexOf('data:image') === 0) {
    try {
      const uploadRes = uploadImage({ base64: photoUrl, fileName: 'shop_' + shopId + '.jpg' });
      if (uploadRes && uploadRes.url) photoUrl = uploadRes.url;
    } catch (imgErr) {
      Logger.log('Shop photo upload error: ' + imgErr.message);
    }
  }

  const newShop = {
    shopId: shopId,
    ownerUserId: body.ownerUserId || '',
    ownerName: body.ownerName || '',
    shopName: body.shopName,
    whatsappNo: body.whatsappNo,
    shopPhoto: photoUrl,
    description: body.description || '',
    villageName: body.villageName || '',
    category: body.category || 'Grocery',
    likeCount: 0,
    status: body.status || 'Pending',
    createdAt: now,
    updatedAt: now,
  };
  appendRowFromObject(SHEETS.SHOPS, newShop);

  if (body.category === 'Grocery' && body.populateDefaults !== false) {
    populateDefaultGroceryItems(shopId);
  }

  return newShop;
}

function updateShop(body) {
  if (!body.shopId) throw new Error('shopId is required');
  body.updatedAt = new Date().toISOString();
  if (body.shopPhoto && body.shopPhoto.indexOf('data:image') === 0) {
    try {
      const uploadRes = uploadImage({ base64: body.shopPhoto, fileName: 'shop_' + body.shopId + '.jpg' });
      if (uploadRes && uploadRes.url) body.shopPhoto = uploadRes.url;
    } catch (imgErr) {
      Logger.log('Shop photo upload error: ' + imgErr.message);
    }
  }
  updateRowById(SHEETS.SHOPS, 'shopId', body.shopId, body);
  return getShop(body.shopId);
}

function deleteShop(body) {
  if (!body.shopId) throw new Error('shopId is required');
  deleteRowById(SHEETS.SHOPS, 'shopId', body.shopId);
  return { deleted: true };
}

function listShopProducts(params) {
  params = params || {};
  let items = sheetToObjects(SHEETS.SHOP_PRODUCTS);
  if (params.shopId) {
    items = items.filter(function (item) { return String(item.shopId) === String(params.shopId); });
  }
  return items;
}

function createShopProduct(body) {
  if (!body.shopId || !body.productName) throw new Error('shopId and productName are required');
  const productId = generateId('SP');
  const now = new Date().toISOString();
  const newItem = {
    productId: productId,
    shopId: body.shopId,
    productName: body.productName,
    tamilName: body.tamilName || '',
    subCategory: body.subCategory || 'General',
    unitScale: body.unitScale || '1Kg',
    availableScales: Array.isArray(body.availableScales) ? body.availableScales.join(',') : (body.availableScales || '250g,500g,1Kg'),
    price: body.price || '',
    inStock: body.inStock !== false ? 'true' : 'false',
    createdAt: now,
    updatedAt: now,
  };
  appendRowFromObject(SHEETS.SHOP_PRODUCTS, newItem);
  return newItem;
}

function updateShopProduct(body) {
  if (!body.productId) throw new Error('productId is required');
  const patch = Object.assign({}, body);
  patch.updatedAt = new Date().toISOString();
  if (Array.isArray(patch.availableScales)) patch.availableScales = patch.availableScales.join(',');
  if (patch.inStock !== undefined) patch.inStock = patch.inStock !== false ? 'true' : 'false';
  updateRowById(SHEETS.SHOP_PRODUCTS, 'productId', body.productId, patch);
  return { success: true };
}

function approveShop(body) {
  if (!body.shopId) throw new Error('shopId is required');
  updateRowById(SHEETS.SHOPS, 'shopId', body.shopId, { status: 'Approved', updatedAt: new Date().toISOString() });
  return getShop(body.shopId);
}

function rejectShop(body) {
  if (!body.shopId) throw new Error('shopId is required');
  updateRowById(SHEETS.SHOPS, 'shopId', body.shopId, { status: 'Rejected', updatedAt: new Date().toISOString() });
  return getShop(body.shopId);
}

function toggleShopLike(body) {
  if (!body.shopId) throw new Error('shopId is required');
  const shop = getShop(body.shopId);
  const newLikeCount = Number(shop.likeCount || 0) + 1;
  updateRowById(SHEETS.SHOPS, 'shopId', body.shopId, { likeCount: newLikeCount, updatedAt: new Date().toISOString() });
  return { liked: true, likeCount: newLikeCount };
}

function deleteProduct(body) {
  if (!body.productId) throw new Error('productId is required');
  deleteRowById(SHEETS.PRODUCTS, 'productId', body.productId);
  return { deleted: true };
}

function populateDefaultGroceryItems(shopId) {
  return populateShopDefaults({ shopId: shopId });
}

function populateShopDefaults(body) {
  const shopId = typeof body === 'object' ? body.shopId : body;
  if (!shopId) throw new Error('shopId is required');
  const defaults = [
    // ==================== VEGETABLES ====================
    { productName: 'தக்காளி', tamilName: 'தக்காளி', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '1Kg', availableScales: '250g,500g,750g,1Kg,1.5Kg,2Kg', price: '' },
    { productName: 'உருளைக்கிழங்கு', tamilName: 'உருளைக்கிழங்கு', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '1Kg', availableScales: '250g,500g,750g,1Kg,1.5Kg,2Kg', price: '' },
    { productName: 'பெரிய வெங்காயம்', tamilName: 'பெரிய வெங்காயம்', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '1Kg', availableScales: '250g,500g,750g,1Kg,1.5Kg,2Kg,5Kg', price: '' },
    { productName: 'சின்ன வெங்காயம்', tamilName: 'சின்ன வெங்காயம்', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '500g', availableScales: '250g,500g,750g,1Kg', price: '' },
    { productName: 'கத்தரிக்காய்', tamilName: 'கத்தரிக்காய்', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '500g', availableScales: '250g,500g,750g,1Kg', price: '' },
    { productName: 'வெண்டைக்காய்', tamilName: 'வெண்டைக்காய்', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '500g', availableScales: '250g,500g,750g,1Kg', price: '' },
    { productName: 'கேரட்', tamilName: 'கேரட்', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '500g', availableScales: '250g,500g,750g,1Kg', price: '' },
    { productName: 'பூண்டு', tamilName: 'பூண்டு', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '250g', availableScales: '100g,250g,500g,1Kg', price: '' },
    { productName: 'இஞ்சி', tamilName: 'இஞ்சி', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '250g', availableScales: '100g,250g,500g', price: '' },
    { productName: 'பச்சை மிளகாய்', tamilName: 'பச்சை மிளகாய்', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '100g', availableScales: '100g,250g,500g', price: '' },
    { productName: 'முட்டைக்கோஸ்', tamilName: 'முட்டைக்கோஸ்', subCategory: 'Vegetables (காய்கறிகள்)', unitScale: '1Kg', availableScales: '500g,1Kg', price: '' },

    // ==================== MALIGAI PORUL ====================
    { productName: 'தனி மிளகாய் பொடி', tamilName: 'தனி மிளகாய் பொடி', subCategory: 'Maligai Porul (மளிகைப் பொருட்கள்)', unitScale: '100g', availableScales: '100g,250g,500g,1Kg', price: '' },
    { productName: 'மஞ்சள் தூள்', tamilName: 'மஞ்சள் தூள்', subCategory: 'Maligai Porul (மளிகைப் பொருட்கள்)', unitScale: '100g', availableScales: '100g,250g,500g', price: '' },
    { productName: 'மல்லி தூள்', tamilName: 'மல்லி தூள்', subCategory: 'Maligai Porul (மளிகைப் பொருட்கள்)', unitScale: '100g', availableScales: '100g,250g,500g', price: '' },
    { productName: 'சீரகம்', tamilName: 'சீரகம்', subCategory: 'Maligai Porul (மளிகைப் பொருட்கள்)', unitScale: '100g', availableScales: '50g,100g,250g,500g', price: '' },
    { productName: 'கடுகு', tamilName: 'கடுகு', subCategory: 'Maligai Porul (மளிகைப் பொருட்கள்)', unitScale: '100g', availableScales: '100g,250g,500g', price: '' },
    { productName: 'பெருங்காயம்', tamilName: 'பெருங்காயம்', subCategory: 'Maligai Porul (மளிகைப் பொருட்கள்)', unitScale: '50g', availableScales: '50g,100g', price: '' },
    { productName: 'மிளகு', tamilName: 'மிளகு', subCategory: 'Maligai Porul (மளிகைப் பொருட்கள்)', unitScale: '100g', availableScales: '50g,100g,250g', price: '' },
    { productName: 'தூள் உப்பு', tamilName: 'தூள் உப்பு', subCategory: 'Maligai Porul (மளிகைப் பொருட்கள்)', unitScale: '1Kg', availableScales: '1Kg', price: '' },
    { productName: 'கல் உப்பு', tamilName: 'கல் உப்பு', subCategory: 'Maligai Porul (மளிகைப் பொருட்கள்)', unitScale: '1Kg', availableScales: '1Kg', price: '' },

    // ==================== OILS ====================
    { productName: 'தேங்காய் எண்ணெய்', tamilName: 'தேங்காய் எண்ணெய்', subCategory: 'Oils (எண்ணெய் வகைகள்)', unitScale: '500ml', availableScales: '250ml,500ml,1 Litre,2 Litre,5 Litre', price: '' },
    { productName: 'நல்லெண்ணெய்', tamilName: 'நல்லெண்ணெய்', subCategory: 'Oils (எண்ணெய் வகைகள்)', unitScale: '500ml', availableScales: '250ml,500ml,1 Litre,2 Litre', price: '' },
    { productName: 'கடலை எண்ணெய்', tamilName: 'கடலை எண்ணெய்', subCategory: 'Oils (எண்ணெய் வகைகள்)', unitScale: '1 Litre', availableScales: '500ml,1 Litre,2 Litre,5 Litre', price: '' },
    { productName: 'சூரியகாந்தி எண்ணெய்', tamilName: 'சூரியகாந்தி எண்ணெய்', subCategory: 'Oils (எண்ணெய் வகைகள்)', unitScale: '1 Litre', availableScales: '500ml,1 Litre,2 Litre,5 Litre', price: '' },
    { productName: 'பசு நெய்', tamilName: 'பசு நெய்', subCategory: 'Oils (எண்ணெய் வகைகள்)', unitScale: '250ml', availableScales: '100ml,250ml,500ml,1 Litre', price: '' },

    // ==================== FLOUR / MAVU ====================
    { productName: 'கடலை மாவு', tamilName: 'கடலை மாவு', subCategory: 'Flour / Mavu (மாவு வகைகள்)', unitScale: '500g', availableScales: '250g,500g,1Kg', price: '' },
    { productName: 'கேப்பை மாவு / ராகி மாவு', tamilName: 'கேப்பை மாவு / ராகி மாவு', subCategory: 'Flour / Mavu (மாவு வகைகள்)', unitScale: '500g', availableScales: '500g,1Kg', price: '' },
    { productName: 'அரிசி மாவு', tamilName: 'அரிசி மாவு', subCategory: 'Flour / Mavu (மாவு வகைகள்)', unitScale: '500g', availableScales: '500g,1Kg', price: '' },
    { productName: 'கோதுமை மாவு', tamilName: 'கோதுமை மாவு', subCategory: 'Flour / Mavu (மாவு வகைகள்)', unitScale: '1Kg', availableScales: '500g,1Kg,5Kg', price: '' },
    { productName: 'மைதா மாவு', tamilName: 'மைதா மாவு', subCategory: 'Flour / Mavu (மாவு வகைகள்)', unitScale: '500g', availableScales: '500g,1Kg', price: '' },

    // ==================== PULSES / PARUPPU ====================
    { productName: 'துவரம் பருப்பு', tamilName: 'துவரம் பருப்பு', subCategory: 'Pulses / Paruppu (பருப்பு வகைகள்)', unitScale: '500g', availableScales: '250g,500g,1Kg,2Kg', price: '' },
    { productName: 'பாசிப் பருப்பு', tamilName: 'பாசிப் பருப்பு', subCategory: 'Pulses / Paruppu (பருப்பு வகைகள்)', unitScale: '250g', availableScales: '250g,500g,1Kg', price: '' },
    { productName: 'உளுந்தம் பருப்பு', tamilName: 'உளுந்தம் பருப்பு', subCategory: 'Pulses / Paruppu (பருப்பு வகைகள்)', unitScale: '500g', availableScales: '250g,500g,1Kg', price: '' },
    { productName: 'கடலைப் பருப்பு', tamilName: 'கடலைப் பருப்பு', subCategory: 'Pulses / Paruppu (பருப்பு வகைகள்)', unitScale: '500g', availableScales: '250g,500g,1Kg', price: '' },
    { productName: 'பொட்டுக்கடலை', tamilName: 'பொட்டுக்கடலை', subCategory: 'Pulses / Paruppu (பருப்பு வகைகள்)', unitScale: '250g', availableScales: '250g,500g,1Kg', price: '' },
    { productName: 'கொண்டைக்கடலை', tamilName: 'கொண்டைக்கடலை', subCategory: 'Pulses / Paruppu (பருப்பு வகைகள்)', unitScale: '500g', availableScales: '250g,500g,1Kg', price: '' },
    { productName: 'கொள்ளு', tamilName: 'கொள்ளு', subCategory: 'Pulses / Paruppu (பருப்பு வகைகள்)', unitScale: '500g', availableScales: '250g,500g,1Kg', price: '' },
  ];

  const now = new Date().toISOString();
  defaults.forEach(function (item) {
    const newItem = {
      productId: generateId('SP'),
      shopId: shopId,
      productName: item.productName,
      tamilName: item.tamilName || item.productName,
      subCategory: item.subCategory,
      unitScale: item.unitScale,
      availableScales: item.availableScales,
      price: item.price,
      inStock: 'true',
      createdAt: now,
      updatedAt: now,
    };
    appendRowFromObject(SHEETS.SHOP_PRODUCTS, newItem);
  });
  return { success: true, count: defaults.length };
}
