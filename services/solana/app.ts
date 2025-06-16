import express from 'express';
import bodyParser from 'body-parser';
import teosRouter from './routes/teos';

const app = express();
app.use(bodyParser.json());
app.use('/api/teos', teosRouter);

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => {
  console.log(`Solana TEOS service running on port ${PORT}`);
});
