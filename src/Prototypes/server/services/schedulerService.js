const cron = require('node-cron');
const pool = require('../db');
const { sendWeeklyAlertsEmail } = require('./emailService');

async function sendWeeklyAlerts() {
  console.log('Starting weekly alerts job...');

  try {
    // Get all users with alerts
    const usersQuery = `
      SELECT DISTINCT u.user_id, u.email
      FROM users u
      JOIN alerts a ON u.user_id = a.user_id
      WHERE u.is_verified = true AND u.is_active = true
    `;
    const usersResult = await pool.query(usersQuery);
    console.log(`Found ${usersResult.rows.length} users with alerts`);

    for (const user of usersResult.rows) {
      console.log(`Processing user: ${user.email}`);
      // Get user's alerts
      const alertsQuery = `
        SELECT topics
        FROM alerts
        WHERE user_id = $1
      `;
      const alertsResult = await pool.query(alertsQuery, [user.user_id]);
      console.log(`User has ${alertsResult.rows.length} alert entries`);

      const alertsData = [];

      for (const alert of alertsResult.rows) {
        console.log(`Alert topics: ${alert.topics.join(', ')}`);
        for (const topic of alert.topics) {
          // Get most recent article for this topic (case-insensitive partial match)
          const articleQuery = `
            SELECT id, title, url, published_at
            FROM articles
            WHERE topic ILIKE '%' || $1 || '%'
            ORDER BY published_at DESC
            LIMIT 1
          `;
          const articleResult = await pool.query(articleQuery, [topic]);
          console.log(`Found ${articleResult.rows.length} articles for topic: ${topic}`);

          if (articleResult.rows.length > 0) {
            alertsData.push({
              topic: topic,
              article: articleResult.rows[0]
            });
          }
        }
      }

      console.log(`Total alerts data for ${user.email}: ${alertsData.length} articles`);

      if (alertsData.length > 0) {
        // Send email
        await sendWeeklyAlertsEmail(user.email, alertsData);
        console.log(`Sent weekly alerts to ${user.email}`);
      } else {
        console.log(`No alerts data for ${user.email}, skipping email`);
      }
    }

    console.log('Weekly alerts job completed.');
  } catch (error) {
    console.error('Error in weekly alerts job:', error);
  }
}

function startScheduler() {
  // Schedule to run every Wednesday at 8:00 AM
  // Cron expression: '0 8 * * 3' (minute 0, hour 8, day of month *, month *, day of week - 3 for Wednesday)
  cron.schedule('0 8 * * 3', () => {
    sendWeeklyAlerts();
  }, {
    timezone: "America/New_York" // Adjust timezone as needed
  });

  console.log('Weekly alerts scheduler started - runs every Wednesday at 8:00 AM EST');
}

module.exports = {
  startScheduler,
  sendWeeklyAlerts // Export for testing
};