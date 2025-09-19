// src/config/db.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DBNAME || 'attendance';

async function connectDB() {
  if (!MONGO_URI) throw new Error('MONGO_URI not set in .env');
  await mongoose.connect(MONGO_URI, {
    dbName: DB_NAME,
    // current driver doesn't need useNewUrlParser/useUnifiedTopology (they are default)
  });
  console.log('✅ Mongoose connected to DB:', mongoose.connection.name);
}

module.exports = connectDB;
