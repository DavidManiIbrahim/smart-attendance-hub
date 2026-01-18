import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, ClipboardCheck, Clock, ArrowRight, BookOpen, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!teacher) {
        setLoading(false);
        return;
      }

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

      const uniqueClasses = new Map<string, AssignedClass>();

      for (const assignment of assignments) {
        const key = `${assignment.class?.id}-${assignment.section?.id}`;
        if (!uniqueClasses.has(key) && assignment.class && assignment.section) {
          const { count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', assignment.class.id)
            .eq('section_id', assignment.section.id)
            .eq('is_active', true);

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 text-black">Teacher Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your classes and student presence</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-xl text-primary font-medium">
          <Calendar className="h-4 w-4" />
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard title="Assigned Classes" value={assignedClasses.length} icon={BookOpen} color="text-blue-600" />
        <StatsCard title="Attendance Marked" value={assignedClasses.filter(c => c.attendanceMarked).length} total={assignedClasses.length} icon={ClipboardCheck} color="text-emerald-600" />
        <StatsCard title="Pending Review" value={assignedClasses.filter(c => !c.attendanceMarked).length} icon={Clock} color="text-yellow-600" />
      </div>

      <Card className="overflow-hidden border-none shadow-lg">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Your Classes
          </CardTitle>
          <CardDescription>Direct links to mark daily attendance</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              Loading your assignments...
            </div>
          ) : assignedClasses.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No classes assigned yet. Please contact an administrator.
            </div>
          ) : (
            <div className="divide-y">
              {assignedClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors group"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-lg group-hover:text-primary transition-colors">
                      {cls.className} - Section {cls.sectionName}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {cls.studentCount} students enrolled
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      cls.attendanceMarked
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                    )}>
                      {cls.attendanceMarked ? "Complete" : "Pending"}
                    </div>
                    <Button asChild size="sm" className="rounded-full shadow-md">
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

const StatsCard = ({ title, value, total, icon: Icon, color }: { title: string, value: number, total?: number, icon: any, color: string }) => (
  <Card className="border-none shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", color)} />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-black">
        {value}{total !== undefined && <span className="text-lg text-muted-foreground font-normal"> / {total}</span>}
      </div>
    </CardContent>
  </Card>
);

