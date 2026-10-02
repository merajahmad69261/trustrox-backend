const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// GET /api/admin/dashboard
async function getDashboard(req, res) {
  try {
    const userCountRows = await query('SELECT COUNT(*) AS totalUsers FROM users');
    const storeCountRows = await query('SELECT COUNT(*) AS totalStores FROM stores');
    const ratingCountRows = await query('SELECT COUNT(*) AS totalRatings FROM ratings');

    const totalUsers = userCountRows[0]?.totalUsers || userCountRows[0]?.['COUNT(*)'] || 0;
    const totalStores = storeCountRows[0]?.totalStores || storeCountRows[0]?.['COUNT(*)'] || 0;
    const totalRatings = ratingCountRows[0]?.totalRatings || ratingCountRows[0]?.['COUNT(*)'] || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers: Number(totalUsers),
        totalStores: Number(totalStores),
        totalRatings: Number(totalRatings),
      },
    });
  } catch (err) {
    console.error('[Admin Dashboard Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin dashboard stats.' });
  }
}

// POST /api/admin/users
async function createUser(req, res) {
  try {
    const { name, email, address, password, role } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, address, hashedPassword, role]
    );

    const newUserId = result.insertId || (Array.isArray(result) && result[0]?.insertId);
    const newUser = await query('SELECT id, name, email, address, role FROM users WHERE id = ?', [newUserId]);

    return res.status(201).json({
      success: true,
      message: `User created successfully with role ${role}.`,
      user: newUser[0],
    });
  } catch (err) {
    console.error('[Admin CreateUser Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
}

// POST /api/admin/stores
async function createStore(req, res) {
  try {
    const { name, email, address, ownerId } = req.body;

    const existing = await query('SELECT id FROM stores WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Store with this email already exists.' });
    }

    let validOwnerId = null;
    if (ownerId) {
      const ownerCheck = await query('SELECT id FROM users WHERE id = ? AND role = ?', [ownerId, 'owner']);
      if (ownerCheck.length === 0) {
        return res.status(400).json({ success: false, message: 'Provided owner ID is not a valid Store Owner.' });
      }
      validOwnerId = ownerId;
    }

    const result = await query(
      'INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)',
      [name, email, address, validOwnerId]
    );

    const newStoreId = result.insertId || (Array.isArray(result) && result[0]?.insertId);
    const newStore = await query('SELECT * FROM stores WHERE id = ?', [newStoreId]);

    return res.status(201).json({
      success: true,
      message: 'Store created successfully.',
      store: newStore[0],
    });
  } catch (err) {
    console.error('[Admin CreateStore Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create store.' });
  }
}

// GET /api/admin/stores (Supports sorting & filtering)
async function getStores(req, res) {
  try {
    const { search = '', sortBy = 'name', order = 'ASC' } = req.query;

    const searchParam = `%${search}%`;
    const allowedSortFields = {
      name: 's.name',
      email: 's.email',
      address: 's.address',
      rating: 'average_rating',
    };

    const sortColumn = allowedSortFields[sortBy] || 's.name';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const sql = `
      SELECT 
        s.id, 
        s.name, 
        s.email, 
        s.address, 
        s.owner_id, 
        u.name AS owner_name, 
        u.email AS owner_email,
        COALESCE(ROUND(AVG(r.rating), 2), 0) AS average_rating,
        COUNT(r.id) AS total_ratings
      FROM stores s
      LEFT JOIN users u ON s.owner_id = u.id
      LEFT JOIN ratings r ON s.id = r.store_id
      WHERE (s.name LIKE ? OR s.email LIKE ? OR s.address LIKE ?)
      GROUP BY s.id, s.name, s.email, s.address, s.owner_id, u.name, u.email
      ORDER BY ${sortColumn} ${sortOrder}
    `;

    const stores = await query(sql, [searchParam, searchParam, searchParam]);

    return res.status(200).json({
      success: true,
      data: stores,
    });
  } catch (err) {
    console.error('[Admin GetStores Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch stores.' });
  }
}

// GET /api/admin/users (Supports sorting & filtering)
async function getUsers(req, res) {
  try {
    const { search = '', role = '', sortBy = 'name', order = 'ASC' } = req.query;

    const searchParam = `%${search}%`;
    const allowedSortFields = {
      name: 'u.name',
      email: 'u.email',
      address: 'u.address',
      role: 'u.role',
      rating: 'store_rating',
    };

    const sortColumn = allowedSortFields[sortBy] || 'u.name';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let roleFilter = '';
    const params = [searchParam, searchParam, searchParam];
    if (role) {
      roleFilter = ' AND u.role = ? ';
      params.push(role);
    }

    const sql = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.address, 
        u.role, 
        s.id AS store_id,
        s.name AS store_name,
        COALESCE(ROUND(AVG(r.rating), 2), 0) AS store_rating
      FROM users u
      LEFT JOIN stores s ON u.id = s.owner_id
      LEFT JOIN ratings r ON s.id = r.store_id
      WHERE (u.name LIKE ? OR u.email LIKE ? OR u.address LIKE ?)${roleFilter}
      GROUP BY u.id, u.name, u.email, u.address, u.role, s.id, s.name
      ORDER BY ${sortColumn} ${sortOrder}
    `;

    const users = await query(sql, params);

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error('[Admin GetUsers Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

module.exports = {
  getDashboard,
  createUser,
  createStore,
  getStores,
  getUsers,
};
