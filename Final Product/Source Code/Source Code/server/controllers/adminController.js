const pool = require("../db");

async function promoteUserToAdmin(req, res, next) {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET is_admin = TRUE
        WHERE email = $1
        RETURNING user_id, email, is_admin, is_verified, is_active` ,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];

    res.json({
      message: `${user.email} is now an admin`,
      user: {
        id: user.user_id,
        email: user.email,
        isAdmin: user.is_admin,
        isVerified: user.is_verified,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function demoteAdminToUser(req, res, next) {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET is_admin = FALSE
        WHERE email = $1
        RETURNING user_id, email, is_admin, is_verified, is_active` ,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];

    res.json({
      message: `${user.email} is now a user`,
      user: {
        id: user.user_id,
        email: user.email,
        isAdmin: user.is_admin,
        isVerified: user.is_verified,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT user_id, email, is_admin
      FROM users
      ORDER BY user_id ASC
    `);

    const users = rows.map(user => ({
      id: user.user_id,
      email: user.email,
      isAdmin: user.is_admin
    }));

    res.json({
      count: users.length,
      users
    });


  } catch (error) {
    next(error);
  }
}

async function deleteUserByEmail(req, res, next) {
  const { email } = req.params;
  const normalizedEmail = email.toLowerCase();

  if (normalizedEmail === req.user.email.toLowerCase()) {
    return res.status(400).json({ error: "Admins cannot delete their own account" });
  }

  try {
    const { rows } = await pool.query(
      `DELETE FROM users
        WHERE email = $1
        RETURNING user_id, email`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: `${rows[0].email} has been deleted`,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  promoteUserToAdmin,
  demoteAdminToUser,
  getAllUsers,
  deleteUserByEmail,
};
