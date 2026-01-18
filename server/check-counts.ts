import { db } from './db';
import { users, students, teachers, classes, sections } from './db/schema';
import { sql } from 'drizzle-orm';

async function check() {
    try {
        const uCount = await db.select({ count: sql`count(*)` }).from(users);
        const sCount = await db.select({ count: sql`count(*)` }).from(students);
        const tCount = await db.select({ count: sql`count(*)` }).from(teachers);
        const cCount = await db.select({ count: sql`count(*)` }).from(classes);
        const secCount = await db.select({ count: sql`count(*)` }).from(sections);

        console.log('Users:', uCount[0].count);
        console.log('Students:', sCount[0].count);
        console.log('Teachers:', tCount[0].count);
        console.log('Classes:', cCount[0].count);
        console.log('Sections:', secCount[0].count);
    } catch (err) {
        console.error('Error checking counts:', err);
    } finally {
        process.exit(0);
    }
}

check();
