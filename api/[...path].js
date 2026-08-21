import app from '../server/src/app.js';
import connectDatabase from '../server/src/config/database.js';

export default async function handler(request, response) {
  try {
    await connectDatabase();
    return app(request, response);
  } catch (error) {
    return response.status(500).json({ message: 'Unable to connect to the database.' });
  }
}
