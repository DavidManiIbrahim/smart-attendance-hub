import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, GraduationCap, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  lowAttendanceCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLate: 0,
    lowAttendanceCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const [
        { count: studentsCount },
        { count: teachersCount },
        { count: classesCount },
        { data: attendanceData },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('status').eq('date', today),
      ]);

      const todayStats = attendanceData?.reduce(
        (acc, record) => {
          if (record.status === 'present') acc.present++;
          else if (record.status === 'absent') acc.absent++;
          else if (record.status === 'late') acc.late++;
          return acc;
        },
        { present: 0, absent: 0, late: 0 }
      ) || { present: 0, absent: 0, late: 0 };

      setStats({
        totalStudents: studentsCount || 0,
        totalTeachers: teachersCount || 0,
        totalClasses: classesCount || 0,
        todayPresent: todayStats.present,
        todayAbsent: todayStats.absent,
        todayLate: todayStats.late,
        lowAttendanceCount: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600' },
    { title: 'Total Teachers', value: stats.totalTeachers, icon: UserCheck, color: 'text-green-600' },
    { title: 'Total Classes', value: stats.totalClasses, icon: GraduationCap, color: 'text-purple-600' },
    { title: 'Present Today', value: stats.todayPresent, icon: ClipboardCheck, color: 'text-emerald-600' },
    { title: 'Absent Today', value: stats.todayAbsent, icon: AlertTriangle, color: 'text-red-600' },
    { title: 'Late Today', value: stats.todayLate, icon: AlertTriangle, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your school's attendance system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Attendance Summary</CardTitle>
            <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Present</span>
                <span className="font-semibold text-emerald-600">{stats.todayPresent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Absent</span>
                <span className="font-semibold text-red-600">{stats.todayAbsent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Late</span>
                <span className="font-semibold text-yellow-600">{stats.todayLate}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Marked</span>
                  <span className="font-bold">{stats.todayPresent + stats.todayAbsent + stats.todayLate}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <a href="/students" className="rounded-lg border p-3 hover:bg-muted transition-colors">
                <div className="font-medium">Manage Students</div>
                <div className="text-sm text-muted-foreground">Add, edit, or remove students</div>
              </a>
              <a href="/teachers" className="rounded-lg border p-3 hover:bg-muted transition-colors">
                <div className="font-medium">Manage Teachers</div>
                <div className="text-sm text-muted-foreground">Assign teachers to classes</div>
              </a>
              <a href="/reports" className="rounded-lg border p-3 hover:bg-muted transition-colors">
                <div className="font-medium">View Reports</div>
                <div className="text-sm text-muted-foreground">Generate attendance reports</div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
