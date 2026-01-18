import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, ClipboardCheck, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface AssignedClass {
  id: string;
  className: string;
  sectionName: string;
  studentCount: number;
  attendanceMarked: boolean;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignedClasses();
    }
  }, [user]);

  const fetchAssignedClasses = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // First get teacher record
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!teacher) {
        setLoading(false);
        return;
      }

      // Get assignments with class and section info
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select(`
          id,
          is_class_teacher,
          class:classes(id, name),
          section:sections(id, name)
        `)
        .eq('teacher_id', teacher.id);

      if (!assignments) {
        setLoading(false);
        return;
      }

      // Get unique class-section combinations
      const uniqueClasses = new Map<string, AssignedClass>();
      
      for (const assignment of assignments) {
        const key = `${assignment.class?.id}-${assignment.section?.id}`;
        if (!uniqueClasses.has(key) && assignment.class && assignment.section) {
          // Count students in this class-section
          const { count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', assignment.class.id)
            .eq('section_id', assignment.section.id)
            .eq('is_active', true);

          // Check if attendance is marked for today
          const { count: markedCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('date', today)
            .in('student_id', 
              (await supabase
                .from('students')
                .select('id')
                .eq('class_id', assignment.class.id)
                .eq('section_id', assignment.section.id)
              ).data?.map(s => s.id) || []
            );

          uniqueClasses.set(key, {
            id: key,
            className: assignment.class.name,
            sectionName: assignment.section.name,
            studentCount: studentCount || 0,
            attendanceMarked: (markedCount || 0) > 0,
          });
        }
      }

      setAssignedClasses(Array.from(uniqueClasses.values()));
    } catch (error) {
      console.error('Error fetching assigned classes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Classes</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedClasses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Marked</CardTitle>
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignedClasses.filter(c => c.attendanceMarked).length} / {assignedClasses.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignedClasses.filter(c => !c.attendanceMarked).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Classes</CardTitle>
          <CardDescription>Classes assigned to you for attendance</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : assignedClasses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No classes assigned yet. Contact an administrator.
            </div>
          ) : (
            <div className="space-y-3">
              {assignedClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="font-medium">
                      {cls.className} - Section {cls.sectionName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {cls.studentCount} students
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {cls.attendanceMarked ? (
                      <span className="text-sm text-emerald-600 font-medium">✓ Marked</span>
                    ) : (
                      <span className="text-sm text-yellow-600 font-medium">Pending</span>
                    )}
                    <Button asChild size="sm">
                      <Link to={`/attendance/mark?class=${cls.id}`}>
                        Mark <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
