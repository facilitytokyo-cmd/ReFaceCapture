const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 静的ファイルのキャッシュを無効化
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

// ルートアクセス時に redirect パラメータを処理して index.html を返す
app.get('/', (req, res) => {
  const redirectUrl = req.query.redirect;
  let displayDomain = "example.com";
  
  if (redirectUrl) {
    try {
      const parsedUrl = new URL(redirectUrl);
      displayDomain = parsedUrl.hostname;
    } catch (e) {
      console.error("Invalid redirect URL:", e);
    }
  }

  // public/index.html を読み込んで、サーバー側でドメイン名を置換して返す
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const fs = require('fs');
  
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      return res.status(500).send('Internal Server Error');
    }

    // HTML内のプレースホルダーや初期ドメインを書き換える
    let modifiedHtml = html
      .replace(/id="siteDomain">[^<]*<\/h1>/, `id="siteDomain">${displayDomain}</h1>`)
      .replace(/id="subNotice">[^<]*<\/div>/, `id="subNotice">${displayDomain} へアクセスする前に、接続のセキュリティを確認する必要があります。</div>`);

    res.send(modifiedHtml);
  });
});

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