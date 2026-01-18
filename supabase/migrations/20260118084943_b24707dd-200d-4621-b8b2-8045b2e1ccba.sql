-- Create enum for user roles (stored in separate table per security requirements)
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create enum for attendance status
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create academic_years table
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sections table
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teachers table (extends profile)
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  employee_id TEXT NOT NULL UNIQUE,
  department TEXT,
  qualification TEXT,
  joining_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teacher_assignments table (assigns teachers to classes/subjects)
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  is_class_teacher BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id, section_id, subject_id)
);

-- Create students table (extends profile with additional info)
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  admission_number TEXT NOT NULL UNIQUE,
  roll_number TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  emergency_contact TEXT,
  blood_group TEXT,
  medical_notes TEXT,
  photo_url TEXT,
  admission_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table (daily attendance)
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  remarks TEXT,
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);

-- Create attendance_lock table (for configurable lock time)
CREATE TABLE public.attendance_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (class_id, section_id, date)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table for system configuration
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for academic_years (read by all, manage by admin)
CREATE POLICY "All can view academic years" ON public.academic_years
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage academic years" ON public.academic_years
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for classes
CREATE POLICY "All can view classes" ON public.classes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage classes" ON public.classes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sections
CREATE POLICY "All can view sections" ON public.sections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage sections" ON public.sections
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subjects
CREATE POLICY "All can view subjects" ON public.subjects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage subjects" ON public.subjects
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teachers
CREATE POLICY "All can view teachers" ON public.teachers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage teachers" ON public.teachers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teacher_assignments
CREATE POLICY "All can view teacher assignments" ON public.teacher_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage teacher assignments" ON public.teacher_assignments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for students
CREATE POLICY "Admins and teachers can view all students" ON public.students
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Students can view own record" ON public.students
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attendance
CREATE POLICY "Admins can view all attendance" ON public.attendance
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view attendance for their classes" ON public.attendance
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_assignments ta ON ta.class_id = s.class_id AND ta.section_id = s.section_id
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE s.id = student_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own attendance" ON public.attendance
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage attendance" ON public.attendance
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can mark attendance for their classes" ON public.attendance
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_assignments ta ON ta.class_id = s.class_id AND ta.section_id = s.section_id
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE s.id = student_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update attendance for their classes" ON public.attendance
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_assignments ta ON ta.class_id = s.class_id AND ta.section_id = s.section_id
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE s.id = student_id AND t.user_id = auth.uid()
    )
  );

-- RLS Policies for attendance_locks
CREATE POLICY "All authenticated can view locks" ON public.attendance_locks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage locks" ON public.attendance_locks
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for audit_logs (admins only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for settings
CREATE POLICY "All can view settings" ON public.settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings" ON public.settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit log trigger function
CREATE OR REPLACE FUNCTION public.log_attendance_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, performed_by)
    VALUES ('attendance', NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES ('attendance', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, performed_by)
    VALUES ('attendance', OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create audit trigger for attendance
CREATE TRIGGER attendance_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.log_attendance_changes();

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES
  ('attendance_lock_hours', '24', 'Hours after which attendance gets locked'),
  ('low_attendance_threshold', '75', 'Percentage below which attendance is considered low'),
  ('school_name', 'Springfield High School', 'Name of the school');

-- Insert current academic year
INSERT INTO public.academic_years (name, start_date, end_date, is_current) VALUES
  ('2024-2025', '2024-04-01', '2025-03-31', true);