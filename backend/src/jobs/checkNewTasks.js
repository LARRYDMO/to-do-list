const cron = require('node-cron');
const db = require('../db');
const { sendNewTaskEmail } = require('../utils/email');

function startCron() {
  // run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.info('[cron] Checking for new tasks...');
      // Join tasks to users so we can email each task owner separately.
      const res = await db.query("SELECT t.*, u.email as owner_email FROM tasks t LEFT JOIN users u ON u.id = t.user_id WHERE t.created_at >= NOW() - INTERVAL '5 minutes'");
      if (res.rows.length > 0) {
        console.info(`[cron] Found ${res.rows.length} new task(s)`);
        // Group tasks by owner_email (null -> fallback address)
        const groups = {};
        for (const row of res.rows) {
          const key = row.owner_email || process.env.EMAIL_USER || 'unknown';
          groups[key] = groups[key] || [];
          groups[key].push(row);
        }

        for (const [ownerEmail, tasks] of Object.entries(groups)) {
          await sendNewTaskEmail(tasks, ownerEmail);
        }
      } else {
        console.info('[cron] No new tasks found');
      }
    } catch (err) {
      console.error('[cron] Error checking new tasks', err);
    }
  });
}

module.exports = { startCron };
