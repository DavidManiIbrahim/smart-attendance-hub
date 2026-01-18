import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, students, teachers, profiles, classes, attendance } from './db/schema';
import { eq, and, sql } from 'drizzle-orm';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};

// --- Auth Routes ---

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [newUser] = await db.insert(users).values({
            email,
            password: hashedPassword,
            fullName,
            role: role as any,
        }).returning();

        // Create student/teacher record
        if (role === 'student') {
            await db.insert(students).values({
                userId: newUser.id,
                admissionNumber: `TEMP-${newUser.id.substring(0, 8)}`,
            });
        } else if (role === 'teacher') {
            await db.insert(teachers).values({
                userId: newUser.id,
                employeeId: `EMP-${newUser.id.substring(0, 8)}`,
            });
        }

        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET);
        res.json({ token, user: { id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role } });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
        const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Dashboard Routes ---

app.get('/api/stats/admin', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
        const studentCount = await db.select({ count: sql<number>`count(*)` }).from(students);
        const teacherCount = await db.select({ count: sql<number>`count(*)` }).from(teachers);
        const classCount = await db.select({ count: sql<number>`count(*)` }).from(classes);

        // Placeholder for today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceStats = await db.select({
            status: attendance.status,
            count: sql<number>`count(*)`
        }).from(attendance).where(eq(attendance.date, today)).groupBy(attendance.status);

        res.json({
            totalStudents: studentCount[0].count,
            totalTeachers: teacherCount[0].count,
            totalClasses: classCount[0].count,
            attendance: attendanceStats
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
