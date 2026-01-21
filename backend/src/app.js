const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const productsRouter = require('./routes/products');
const { notFound, errorHandler } = require('./utils/errors');

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:8080';

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(cors({ origin: corsOrigin, credentials: true }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/products', productsRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
