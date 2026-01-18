import { pgTable, serial, text, integer, timestamp, date, boolean, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const appRoleEnum = pgEnum('app_role', ['admin', 'teacher', 'student']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'late']);

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(), // New for self-hosted auth
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    role: appRoleEnum('role').notNull().default('student'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const academicYears = pgTable('academic_years', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    isCurrent: boolean('is_current').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const classes = pgTable('classes', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    gradeLevel: integer('grade_level').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sections = pgTable('sections', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subjects = pgTable('subjects', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    code: text('code'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const teachers = pgTable('teachers', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
    employeeId: text('employee_id').notNull().unique(),
    department: text('department'),
    qualification: text('qualification'),
    joiningDate: date('joining_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const teacherAssignments = pgTable('teacher_assignments', {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
    classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
    sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'cascade' }).notNull(),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
    isClassTeacher: boolean('is_class_teacher').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const students = pgTable('students', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
    admissionNumber: text('admission_number').notNull().unique(),
    rollNumber: text('roll_number'),
    classId: uuid('class_id').references(() => classes.id),
    sectionId: uuid('section_id').references(() => sections.id),
    dateOfBirth: date('date_of_birth'),
    gender: text('gender'),
    address: text('address'),
    parentName: text('parent_name'),
    parentPhone: text('parent_phone'),
    parentEmail: text('parent_email'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const attendance = pgTable('attendance', {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
    date: date('date').notNull(),
    status: attendanceStatusEnum('status').notNull().default('present'),
    remarks: text('remarks'),
    markedBy: uuid('marked_by').references(() => users.id),
    markedAt: timestamp('marked_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
