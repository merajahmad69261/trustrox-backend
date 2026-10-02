const { query } = require('../config/db');

// GET /api/user/stores (Fetch stores with overall rating & user's own submitted rating)
async function getStores(req, res) {
  try {
    const userId = req.user.id;
    const { search = '' } = req.query;

    const searchParam = `%${search}%`;

    const sql = `
      SELECT 
        s.id,
        s.name,
        s.email,
        s.address,
        COALESCE(ROUND(AVG(r.rating), 2), 0) AS overall_rating,
        COUNT(r.id) AS total_ratings,
        my_rating.rating AS user_rating,
        my_rating.id AS user_rating_id
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      LEFT JOIN ratings my_rating ON s.id = my_rating.store_id AND my_rating.user_id = ?
      WHERE s.name LIKE ? OR s.address LIKE ?
      GROUP BY s.id, s.name, s.email, s.address, my_rating.rating, my_rating.id
      ORDER BY s.name ASC
    `;

    const stores = await query(sql, [userId, searchParam, searchParam]);

    return res.status(200).json({
      success: true,
      data: stores,
    });
  } catch (err) {
    console.error('[User GetStores Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch store listing.' });
  }
}

// POST /api/user/ratings (Submit a rating 1-5 for a store)
async function submitRating(req, res) {
  try {
    const userId = req.user.id;
    const { storeId, rating } = req.body;

    // Check store exists
    const store = await query('SELECT id FROM stores WHERE id = ?', [storeId]);
    if (store.length === 0) {
      return res.status(404).json({ success: false, message: 'Store not found.' });
    }

    // Check if user already rated this store
    const existing = await query('SELECT id FROM ratings WHERE user_id = ? AND store_id = ?', [userId, storeId]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a rating for this store. Use update rating to modify your score.',
      });
    }

    const result = await query(
      'INSERT INTO ratings (user_id, store_id, rating) VALUES (?, ?, ?)',
      [userId, storeId, rating]
    );

    const ratingId = result.insertId || (Array.isArray(result) && result[0]?.insertId);

    return res.status(201).json({
      success: true,
      message: 'Rating submitted successfully.',
      rating: {
        id: ratingId,
        user_id: userId,
        store_id: storeId,
        rating,
      },
    });
  } catch (err) {
    console.error('[User SubmitRating Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to submit rating.' });
  }
}

// PUT /api/user/ratings/:ratingId (Modify user's previously submitted rating)
async function updateRating(req, res) {
  try {
    const userId = req.user.id;
    const { ratingId } = req.params;
    const { rating } = req.body;

    // Verify ownership of the rating
    const existing = await query('SELECT * FROM ratings WHERE id = ? AND user_id = ?', [ratingId, userId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rating record not found or you do not have permission to modify it.',
      });
    }

    await query('UPDATE ratings SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [rating, ratingId]);

    return res.status(200).json({
      success: true,
      message: 'Rating updated successfully.',
      ratingId: Number(ratingId),
      rating,
    });
  } catch (err) {
    console.error('[User UpdateRating Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update rating.' });
  }
}

module.exports = {
  getStores,
  submitRating,
  updateRating,
};
