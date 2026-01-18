import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, students, teachers, profiles, classes, attendance, teacherAssignments, sections, subjects, settings, academicYears } from './db/schema';
import { eq, and, sql } from 'drizzle-orm';

dotenv.config();

const app = express();
// Force 3001 if PORT looks like a database port (accidental leak)
const PORT = (process.env.PORT && process.env.PORT !== '5432') ? process.env.PORT : 3001;
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

// --- Academic Routes ---

app.get('/api/classes', authenticateToken, async (req, res) => {
    try {
        const allByGrade = await db.select().from(classes).orderBy(classes.gradeLevel);
        res.json(allByGrade);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/classes/full', authenticateToken, async (req, res) => {
    try {
        const classesData = await db.select().from(classes).orderBy(classes.gradeLevel);

        const fullData = await Promise.all(classesData.map(async (cls) => {
            const classSections = await db.select().from(sections).where(eq(sections.classId, cls.id));
            const [{ count: studentCount }] = await db.select({ count: sql<number>`count(*)` })
                .from(students)
                .where(and(eq(students.classId, cls.id), eq(students.isActive, true)));

            return {
                ...cls,
                grade_level: cls.gradeLevel,
                sections: classSections,
                studentCount
            };
        }));

        res.json(fullData);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sections', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.query;
        const data = await db.select().from(sections).where(classId ? eq(sections.classId, classId as string) : sql`true`);
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/classes', authenticateToken, async (req, res) => {
    const { name, gradeLevel, sections: sectionNames } = req.body;
    try {
        const [newClass] = await db.insert(classes).values({
            name,
            gradeLevel: parseInt(gradeLevel)
        }).returning();

        if (sectionNames && sectionNames.length > 0) {
            await db.insert(sections).values(sectionNames.map((n: string) => ({
                name: n,
                classId: newClass.id
            })));
        }

        res.json(newClass);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/subjects', authenticateToken, async (req, res) => {
    try {
        const data = await db.select().from(subjects).orderBy(subjects.name);
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/subjects', authenticateToken, async (req, res) => {
    const { name, code } = req.body;
    try {
        const [newSubject] = await db.insert(subjects).values({
            name,
            code: code || null
        }).returning();
        res.json(newSubject);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Teacher Routes ---

app.get('/api/teachers/me', authenticateToken, async (req: any, res) => {
    try {
        const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, req.user.id)).limit(1);
        res.json(teacher);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/teachers/detailed', authenticateToken, async (req, res) => {
    try {
        const teachersData = await db.select({
            id: teachers.id,
            employee_id: teachers.employeeId,
            department: teachers.department,
            qualification: teachers.qualification,
            joining_date: teachers.joiningDate,
            userId: teachers.userId,
            fullName: users.fullName,
            email: users.email
        })
            .from(teachers)
            .innerJoin(users, eq(teachers.userId, users.id))
            .orderBy(teachers.employeeId);

        const fullData = await Promise.all(teachersData.map(async (t) => {
            const assignments = await db.select({
                is_class_teacher: teacherAssignments.isClassTeacher,
                className: classes.name,
                sectionName: sections.name
            })
                .from(teacherAssignments)
                .leftJoin(classes, eq(teacherAssignments.classId, classes.id))
                .leftJoin(sections, eq(teacherAssignments.sectionId, sections.id))
                .where(eq(teacherAssignments.teacherId, t.id));

            return {
                ...t,
                profile: { full_name: t.fullName, email: t.email },
                assignments: assignments.map(a => ({
                    class: { name: a.className },
                    section: { name: a.sectionName },
                    is_class_teacher: a.is_class_teacher
                }))
            };
        }));

        res.json(fullData);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/teacher/assignments', authenticateToken, async (req: any, res) => {
    const { teacherId } = req.query;
    try {
        const data = await db.select({
            id: teacherAssignments.id,
            classId: teacherAssignments.classId,
            sectionId: teacherAssignments.sectionId,
            class: {
                id: classes.id,
                name: classes.name
            }
        })
            .from(teacherAssignments)
            .innerJoin(classes, eq(teacherAssignments.classId, classes.id))
            .where(eq(teacherAssignments.teacherId, teacherId as string));

        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/teacher/dashboard-stats', authenticateToken, async (req: any, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, req.user.id)).limit(1);
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        const assignments = await db.select({
            id: teacherAssignments.id,
            classId: teacherAssignments.classId,
            sectionId: teacherAssignments.sectionId,
            className: classes.name,
            sectionName: sections.name
        })
            .from(teacherAssignments)
            .innerJoin(classes, eq(teacherAssignments.classId, classes.id))
            .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
            .where(eq(teacherAssignments.teacherId, teacher.id));

        const enrichedStats = await Promise.all(assignments.map(async (a) => {
            const [{ count: studentCount }] = await db.select({ count: sql<number>`count(*)` })
                .from(students)
                .where(and(eq(students.classId, a.classId), eq(students.sectionId, a.sectionId), eq(students.isActive, true)));

            // Check if any attendance marked today for this class/section
            const [{ count: markedCount }] = await db.select({ count: sql<number>`count(*)` })
                .from(attendance)
                .innerJoin(students, eq(attendance.studentId, students.id))
                .where(and(eq(attendance.date, today), eq(students.classId, a.classId), eq(students.sectionId, a.sectionId)));

            return {
                id: `${a.classId}-${a.sectionId}`,
                className: a.className,
                sectionName: a.sectionName,
                studentCount,
                attendanceMarked: markedCount > 0
            };
        }));

        res.json(enrichedStats);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Student Routes ---

app.get('/api/students', authenticateToken, async (req, res) => {
    const { classId, sectionId, userId } = req.query;
    try {
        const data = await db.select({
            id: students.id,
            admissionNumber: students.admissionNumber,
            rollNumber: students.rollNumber,
            userId: students.userId,
            fullName: users.fullName
        })
            .from(students)
            .innerJoin(users, eq(students.userId, users.id))
            .where(
                and(
                    classId ? eq(students.classId, classId as string) : sql`true`,
                    sectionId ? eq(students.sectionId, sectionId as string) : sql`true`,
                    userId ? eq(students.userId, userId as string) : sql`true`,
                    eq(students.isActive, true)
                )
            )
            .orderBy(students.rollNumber);

        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/students/detailed', authenticateToken, async (req, res) => {
    try {
        const data = await db.select({
            id: students.id,
            admission_number: students.admissionNumber,
            roll_number: students.rollNumber,
            date_of_birth: students.dateOfBirth,
            gender: students.gender,
            parent_name: students.parentName,
            parent_phone: students.parentPhone,
            is_active: students.isActive,
            classId: students.classId,
            sectionId: students.sectionId,
            className: classes.name,
            sectionName: sections.name,
            fullName: users.fullName,
            email: users.email
        })
            .from(students)
            .innerJoin(users, eq(students.userId, users.id))
            .leftJoin(classes, eq(students.classId, classes.id))
            .leftJoin(sections, eq(students.sectionId, sections.id))
            .orderBy(students.admissionNumber);

        const formatted = data.map(s => ({
            ...s,
            class: s.classId ? { id: s.classId, name: s.className } : null,
            section: s.sectionId ? { id: s.sectionId, name: s.sectionName } : null,
            profile: { full_name: s.fullName, email: s.email }
        }));

        res.json(formatted);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/teachers/me', authenticateToken, async (req: any, res) => {
    try {
        const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, req.user.id)).limit(1);
        res.json(teacher || null);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/student/dashboard-stats', authenticateToken, async (req: any, res) => {
    try {
        const [student] = await db.select({
            id: students.id,
            fullName: users.fullName,
            className: classes.name,
            sectionName: sections.name,
            rollNumber: students.rollNumber
        })
            .from(students)
            .innerJoin(users, eq(students.userId, users.id))
            .leftJoin(classes, eq(students.classId, classes.id))
            .leftJoin(sections, eq(students.sectionId, sections.id))
            .where(eq(students.userId, req.user.id))
            .limit(1);

        if (!student) return res.status(404).json({ error: 'Student not found' });

        const records = await db.select().from(attendance).where(eq(attendance.studentId, student.id));

        const stats = {
            total: records.length,
            present: records.filter(r => r.status === 'present').length,
            absent: records.filter(r => r.status === 'absent').length,
            late: records.filter(r => r.status === 'late').length,
            percentage: records.length > 0 ? Math.round(((records.filter(r => r.status === 'present').length + records.filter(r => r.status === 'late').length) / records.length) * 100) : 0
        };

        res.json({
            studentInfo: student,
            stats,
            recentAttendance: records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Attendance Routes ---

app.get('/api/attendance', authenticateToken, async (req, res) => {
    const { date, studentId } = req.query;
    try {
        const data = await db.select()
            .from(attendance)
            .where(
                and(
                    date ? eq(attendance.date, date as string) : sql`true`,
                    studentId ? eq(attendance.studentId, studentId as string) : sql`true`
                )
            );
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/attendance/upsert', authenticateToken, async (req: any, res) => {
    const { records } = req.body;
    try {
        // Get lock setting
        const [lockSetting] = await db.select().from(settings).where(eq(settings.key, 'attendance_lock_hours')).limit(1);
        const lockHours = parseInt(lockSetting?.value || '24');
        const now = new Date();

        for (const record of records) {
            // Locking check (skip for admins)
            if (req.user.role !== 'admin') {
                const recordDate = new Date(record.date);
                // Set to end of the record date (23:59:59)
                const lockTime = new Date(recordDate);
                lockTime.setHours(23, 59, 59, 999);
                lockTime.setHours(lockTime.getHours() + lockHours);

                if (now > lockTime) {
                    return res.status(403).json({ error: `Attendance for ${record.date} is locked.` });
                }
            }

            const existing = await db.select().from(attendance)
                .where(and(eq(attendance.studentId, record.studentId), eq(attendance.date, record.date)))
                .limit(1);

            if (existing.length > 0) {
                await db.update(attendance).set({
                    status: record.status,
                    remarks: record.remarks,
                    markedBy: req.user.id,
                    updatedAt: new Date()
                }).where(eq(attendance.id, existing[0].id));
            } else {
                await db.insert(attendance).values({
                    studentId: record.studentId,
                    date: record.date,
                    status: record.status,
                    remarks: record.remarks,
                    markedBy: req.user.id
                });
            }
        }
        res.json({ message: 'Attendance saved' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/attendance', authenticateToken, async (req, res) => {
    const { classId, sectionId, startDate, endDate } = req.query;
    try {
        const studentList = await db.select({
            id: students.id,
            admissionNumber: students.admissionNumber,
            rollNumber: students.rollNumber,
            fullName: users.fullName
        })
            .from(students)
            .innerJoin(users, eq(students.userId, users.id))
            .where(and(eq(students.classId, classId as string), eq(students.sectionId, sectionId as string), eq(students.isActive, true)));

        const reportData = await Promise.all(studentList.map(async (s) => {
            const records = await db.select().from(attendance)
                .where(
                    and(
                        eq(attendance.studentId, s.id),
                        sql`date >= ${startDate as string}`,
                        sql`date <= ${endDate as string}`
                    )
                );

            const stats = {
                present: records.filter(r => r.status === 'present').length,
                absent: records.filter(r => r.status === 'absent').length,
                late: records.filter(r => r.status === 'late').length
            };

            const total = stats.present + stats.absent + stats.late;
            const percentage = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 0;

            return {
                id: s.id,
                name: s.fullName,
                rollNumber: s.rollNumber,
                admissionNumber: s.admissionNumber,
                ...stats,
                total,
                percentage
            };
        }));

        res.json(reportData);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/attendance/check-lock', authenticateToken, async (req, res) => {
    const { date } = req.query;
    try {
        const [lockSetting] = await db.select().from(settings).where(eq(settings.key, 'attendance_lock_hours')).limit(1);
        const lockHours = parseInt(lockSetting?.value || '24');
        const now = new Date();
        const recordDate = new Date(date as string);

        const lockTime = new Date(recordDate);
        lockTime.setHours(23, 59, 59, 999);
        lockTime.setHours(lockTime.getHours() + lockHours);

        res.json({ isLocked: now > lockTime });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const data = await db.select().from(settings).orderBy(settings.key);
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/bulk', authenticateToken, async (req, res) => {
    const { settings: settingsList } = req.body;
    try {
        for (const s of settingsList) {
            await db.update(settings).set({ value: s.value }).where(eq(settings.id, s.id));
        }
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/academic-years/current', authenticateToken, async (req, res) => {
    try {
        const [currentYear] = await db.select().from(academicYears).where(eq(academicYears.isCurrent, true)).limit(1);
        res.json(currentYear || null);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
