'use strict';

const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.development') });

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.post('/analyticpay/:clientCode', async (req, res) => {
  const { clientCode } = req.params;

  try {
    const clientFilePath = path.join(__dirname, 'src/routes', `${clientCode}.js`);
    const handler = require(clientFilePath);

    await Promise.resolve(handler(req.body));

    res.status(200).send('Successfully received');
  } catch (error) {
    console.error(`[Error] Webhook ${clientCode}: ${error.message}`);
    res.status(500).send('Error processing webhook');
  }
});

app.listen(PORT, '0.0.0.0', (error) => {
  if (error) {
    console.error('[Error] Starting server:', error);
    process.exit(1);
  }
  console.info(`Service running at http://0.0.0.0:${PORT}`);
});
