const dotenv = require('dotenv');
dotenv.config();

const app = require('./src/app');
const { startCron } = require('./src/jobs/checkNewTasks');

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // start cron job after server is up
  startCron();
});
