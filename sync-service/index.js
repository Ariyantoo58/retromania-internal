import express from 'express';
import cron from 'node-cron';
import morgan from 'morgan';
import path from 'path';
import { execSync } from 'node:child_process';

const SYNC = path.resolve(__dirname, '../client-game-sync.js');
const PORT = process.env.PORT || 4000;
const app = express();

// helper for sync
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

app.use(morgan('dev'));

/* Endpoint manual: POST /sync */
app.post('/sync', (_req, res) => {
  try {
    run(`node ${SYNC}`);
    res.json({ ok: true, message: 'Sync complete' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* Cron otomatis tiap 5 menit */
cron.schedule('*/5 * * * *', () => {
  console.log('[cron] mirror job start', new Date().toISOString());
  try {
    run(`node ${SYNC}`);
    console.log('[cron] success');
  } catch (e) {
    console.error('[cron] failed:', e.message);
  }
});

app.listen(PORT, () => console.log(`Sync-service on :${PORT}`));
