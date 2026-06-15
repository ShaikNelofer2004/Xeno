import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { customerRoutes } from './routes/customers';
import { segmentRoutes } from './routes/segments';
import { campaignRoutes } from './routes/campaigns';
import { receiptRoutes } from './routes/receipt';
import { agentRoutes } from './routes/agent';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.WEB_URL || 'https://xenocrm.vercel.app'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'xenocrm-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/customers', customerRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/receipt', receiptRoutes);
app.use('/api/agent', agentRoutes);

app.listen(PORT, () => {
  console.log(` XenoCRM API running on http://localhost:${PORT}`);
  
  // Mutual Keep-Alive: Ping the Stub every 10 minutes to prevent Render sleep
  setInterval(() => {
    const stubUrl = process.env.STUB_URL;
    if (stubUrl && stubUrl.includes('onrender.com')) {
      fetch(`${stubUrl}/health`)
        .then(() => console.log('💓 Keep-Alive Ping sent to Stub'))
        .catch(() => {});
    }
  }, 10 * 60 * 1000);
});

export default app;
