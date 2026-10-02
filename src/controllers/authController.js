const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// POST /api/auth/signup (Normal User Registration)
async function signup(req, res) {
  try {
    const { name, email, address, password } = req.body;

    // Check if email already exists
    const existingUsers = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, address, hashedPassword, 'user']
    );

    const newUserId = result.insertId || (Array.isArray(result) && result[0]?.insertId);

    // Fetch created user
    const users = await query('SELECT id, name, email, address, role FROM users WHERE id = ?', [newUserId]);
    const user = users[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'trustrox_secret',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user,
    });
  } catch (err) {
    console.error('[Signup Controller Error]', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
}

// POST /api/auth/login (Single login endpoint for all roles)
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'trustrox_secret',
      { expiresIn: '24h' }
    );

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      role: user.role,
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error('[Login Controller Error]', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

// PATCH /api/auth/update-password (Authenticated endpoint for password update)
async function updatePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = users[0];
    const isOldValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password provided is incorrect.',
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    console.error('[UpdatePassword Error]', err);
    return res.status(500).json({ success: false, message: 'Internal server error while updating password.' });
  }
}

module.exports = {
  signup,
  login,
  updatePassword,
};
