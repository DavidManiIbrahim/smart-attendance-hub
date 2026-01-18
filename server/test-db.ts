import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function test() {
    console.log('Testing connection to:', process.env.DATABASE_URL);
    try {
        const client = await pool.connect();
        console.log('Successfully connected to the database');
        const res = await client.query('SELECT NOW()');
        console.log('Result:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await pool.end();
    }
}

test();
