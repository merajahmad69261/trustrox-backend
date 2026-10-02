const { query } = require('../config/db');

// GET /api/owner/dashboard
async function getDashboard(req, res) {
  try {
    const ownerId = req.user.id;

    // Find store owned by this owner
    const stores = await query('SELECT * FROM stores WHERE owner_id = ?', [ownerId]);

    if (stores.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No store currently assigned to this Store Owner account.',
        data: {
          store: null,
          averageRating: 0,
          totalRatings: 0,
          ratedUsers: [],
        },
      });
    }

    const store = stores[0];

    // Fetch average rating and count
    const ratingStats = await query(
      `SELECT 
        COALESCE(ROUND(AVG(rating), 2), 0) AS average_rating,
        COUNT(id) AS total_ratings
       FROM ratings 
       WHERE store_id = ?`,
      [store.id]
    );

    const averageRating = Number(ratingStats[0]?.average_rating || 0);
    const totalRatings = Number(ratingStats[0]?.total_ratings || 0);

    // Fetch list of users who submitted ratings for their store
    const ratedUsers = await query(
      `SELECT 
        r.id AS rating_id,
        r.rating,
        r.created_at,
        r.updated_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.address AS user_address
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       WHERE r.store_id = ?
       ORDER BY r.updated_at DESC`,
      [store.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        store: {
          id: store.id,
          name: store.name,
          email: store.email,
          address: store.address,
        },
        averageRating,
        totalRatings,
        ratedUsers,
      },
    });
  } catch (err) {
    console.error('[Owner Dashboard Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch owner dashboard metrics.' });
  }
}

module.exports = {
  getDashboard,
};
