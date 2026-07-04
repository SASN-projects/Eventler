const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1',
    database: process.env.DB_NAME || 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to the database.');

    // 1. Add tags column if it doesn't exist
    console.log('Altering slider_questions table...');
    await client.query(`
      ALTER TABLE slider_questions 
      ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
    `);

    // Create GIN index for fast tag lookups if it does not exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_slider_questions_tags ON slider_questions USING GIN (tags);
    `);

    // 2. Clear existing questions to avoid conflicts/duplicates
    console.log('Clearing old slider questions...');
    await client.query('DELETE FROM question_options;');
    await client.query('DELETE FROM slider_questions;');

    // 3. Read seed JSON
    const seedPath = path.join(__dirname, '../db/tag_based_questions_seed.json');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at ${seedPath}`);
    }
    const questions = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    console.log(`Seeding ${questions.length} questions...`);
    for (const q of questions) {
      const code = q.code;

      // Insert question
      const qRes = await client.query(
        `INSERT INTO slider_questions (code, label, description, answer_mode, tags) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [code, q.question_text, '', 'options', q.associated_tags]
      );
      const questionId = qRes.rows[0].id;

      // Insert options
      for (const opt of q.options) {
        await client.query(
          `INSERT INTO question_options (question_id, value) 
           VALUES ($1, $2)`,
          [questionId, opt.value]
        );
      }
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await client.end();
  }
}

run();
