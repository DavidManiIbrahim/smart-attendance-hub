import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

interface RecentAttendance {
  date: string;
  status: 'present' | 'absent' | 'late';
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([]);
  const [studentInfo, setStudentInfo] = useState<{
    name: string;
    className: string;
    section: string;
    rollNumber: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      // Get student record
      const { data: student } = await supabase
        .from('students')
        .select(`
          id,
          roll_number,
          class:classes(name),
          section:sections(name)
        `)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!student) {
        setLoading(false);
        return;
      }

      // Get profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user!.id)
        .maybeSingle();

      setStudentInfo({
        name: profile?.full_name || 'Student',
        className: student.class?.name || 'N/A',
        section: student.section?.name || 'N/A',
        rollNumber: student.roll_number || 'N/A',
      });

      // Get attendance for current month
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      const { data: attendance } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('student_id', student.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false });

      if (attendance) {
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const late = attendance.filter(a => a.status === 'late').length;
        const total = attendance.length;

        setStats({
          total,
          present,
          absent,
          late,
          percentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
        });

        setRecentAttendance(
          attendance.slice(0, 10).map(a => ({
            date: a.date,
            status: a.status as 'present' | 'absent' | 'late',
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'late':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!studentInfo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Student Record Not Found</h2>
        <p className="text-muted-foreground mt-2">
          Please contact an administrator to set up your student profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {studentInfo.name}</h1>
        <p className="text-muted-foreground">
          {studentInfo.className} - Section {studentInfo.section} | Roll No: {studentInfo.rollNumber}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance %</CardTitle>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(stats.percentage)}`}>
              {stats.percentage}%
            </div>
            <Progress value={stats.percentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.present}</div>
            <p className="text-xs text-muted-foreground">days this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            <p className="text-xs text-muted-foreground">days this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            <p className="text-xs text-muted-foreground">days this month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>Your attendance records for {format(new Date(), 'MMMM yyyy')}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records yet for this month
            </div>
          ) : (
            <div className="space-y-2">
              {recentAttendance.map((record) => (
                <div
                  key={record.date}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-medium">
                    {format(new Date(record.date), 'EEEE, MMMM d')}
                  </span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(record.status)}
                    <span className="capitalize text-sm">{record.status}</span>
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
