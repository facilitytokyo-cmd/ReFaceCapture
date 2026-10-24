const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 開発中・テスト時のキャッシュトラブルを防ぐため、静的ファイルのキャッシュを完全に無効化する設定
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// 設定されたAPIキー
const VALID_API_KEY = 'nakiron';

// 発行されたトークンを一時記憶するメモリ
const validTokens = new Set();

// 1. パズル成功時にトークンを発行するAPI
app.post('/api/issue-token', (req, res) => {
  const { apiKey } = req.body;
  
  if (apiKey !== VALID_API_KEY) {
    return res.status(403).json({ success: false, message: '無効なAPIキーです。' });
  }

  const token = 'rf_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  validTokens.add(token);

  res.json({ success: true, token: token });
});

// 2. 外部サイトのサーバーから「トークンが正しいか」検証されるAPI
app.post('/api/siteverify', (req, res) => {
  const { secretKey, token } = req.body;

  if (secretKey !== VALID_API_KEY) {
    return res.json({ success: false, message: 'APIキーが一致しません。' });
  }

  if (validTokens.has(token)) {
    validTokens.delete(token);
    return res.json({ success: true, verified_at: new Date().toISOString() });
  } else {
    return res.json({ success: false, message: 'トークンが無効または有効期限切れです。' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ReFaceNet API Server running on port ${PORT}`));