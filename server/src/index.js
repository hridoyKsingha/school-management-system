import 'dotenv/config';
import connectDatabase from './config/database.js';
import app from './app.js';

const port = process.env.PORT || 5000;

async function startServer() {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Unable to start the API:', error.message);
  process.exit(1);
});
