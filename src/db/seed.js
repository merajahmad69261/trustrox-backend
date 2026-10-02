const { initDatabase, query } = require('../config/db');
const bcrypt = require('bcryptjs');

async function runSeed() {
  console.log('[Seed] Starting database initialization and seeding...');
  await initDatabase();

  // Create demo data if needed
  try {
    // Check demo user
    const users = await query('SELECT * FROM users WHERE email = ?', ['normaluser@trustrox.com']);
    let normalUserId;
    if (users.length === 0) {
      const hash = await bcrypt.hash('User@12345!', 10);
      const res = await query(
        'INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)',
        ['Johnathan Alexander Developer', 'normaluser@trustrox.com', '742 Evergreen Terrace, Sector 42, Springfield City', hash, 'user']
      );
      normalUserId = res.insertId || res[0]?.insertId;
      console.log('[Seed] Created demo Normal User (normaluser@trustrox.com / User@12345!)');
    } else {
      normalUserId = users[0].id;
    }

    // Check demo store owner
    const owners = await query('SELECT * FROM users WHERE email = ?', ['storeowner@trustrox.com']);
    let ownerId;
    if (owners.length === 0) {
      const hash = await bcrypt.hash('Owner@12345!', 10);
      const res = await query(
        'INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)',
        ['Samantha Vance Retail Group Owner', 'storeowner@trustrox.com', '12 Commerce Park Avenue, Retail Hub District', hash, 'owner']
      );
      ownerId = res.insertId || res[0]?.insertId;
      console.log('[Seed] Created demo Store Owner (storeowner@trustrox.com / Owner@12345!)');
    } else {
      ownerId = owners[0].id;
    }

    // Check demo stores
    const stores = await query('SELECT * FROM stores WHERE email = ?', ['apex.electronics@trustrox.com']);
    let storeId;
    if (stores.length === 0) {
      const res = await query(
        'INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)',
        ['Apex Electronics & Appliances Hub', 'apex.electronics@trustrox.com', '12 Commerce Park Avenue, Retail Hub District', ownerId]
      );
      storeId = res.insertId || res[0]?.insertId;
      console.log('[Seed] Created demo store (Apex Electronics & Appliances Hub)');
    } else {
      storeId = stores[0].id;
    }

    // Check another store
    const store2 = await query('SELECT * FROM stores WHERE email = ?', ['metro.supermarket@trustrox.com']);
    if (store2.length === 0) {
      await query(
        'INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)',
        ['Metro Fresh Foods Supermarket Center', 'metro.supermarket@trustrox.com', '99 Boulevard Plaza, Central Square', null]
      );
      console.log('[Seed] Created demo store (Metro Fresh Foods Supermarket Center)');
    }

    // Seed demo rating
    const ratings = await query('SELECT * FROM ratings WHERE user_id = ? AND store_id = ?', [normalUserId, storeId]);
    if (ratings.length === 0 && normalUserId && storeId) {
      await query('INSERT INTO ratings (user_id, store_id, rating) VALUES (?, ?, ?)', [normalUserId, storeId, 5]);
      console.log('[Seed] Created demo rating (5 stars for Apex Electronics)');
    }

    console.log('[Seed] Seeding completed successfully!');
  } catch (err) {
    console.error('[Seed Error]', err);
  }
}

if (require.main === module) {
  runSeed().then(() => process.exit(0));
}

module.exports = runSeed;
