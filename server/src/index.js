import 'dotenv/config';
import express from 'express';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'school-management-api' });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
