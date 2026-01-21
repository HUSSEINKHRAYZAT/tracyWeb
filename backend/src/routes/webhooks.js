const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const Order = require('../models/Order');

// Webhooks for Areeba and Whish payment gateways can be added here when needed

module.exports = router;
