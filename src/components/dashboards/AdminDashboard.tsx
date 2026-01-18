import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Users, UserCheck, GraduationCap, ClipboardCheck, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
      const data = await api.get('/stats/admin');

      const attendanceMap = { present: 0, absent: 0, late: 0 };
      data.attendance?.forEach((item: { status: string; count: number }) => {
        if (item.status in attendanceMap) {
          attendanceMap[item.status as keyof typeof attendanceMap] = Number(item.count);
        }
      });

      setStats({
        totalStudents: Number(data.totalStudents) || 0,
        totalTeachers: Number(data.totalTeachers) || 0,
        totalClasses: Number(data.totalClasses) || 0,
        todayPresent: attendanceMap.present,
        todayAbsent: attendanceMap.absent,
        todayLate: attendanceMap.late,
        lowAttendanceCount: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, gradient: 'from-blue-500/10 to-blue-600/10', iconColor: 'text-blue-600' },
    { title: 'Total Teachers', value: stats.totalTeachers, icon: UserCheck, gradient: 'from-green-500/10 to-green-600/10', iconColor: 'text-green-600' },
    { title: 'Total Classes', value: stats.totalClasses, icon: GraduationCap, gradient: 'from-purple-500/10 to-purple-600/10', iconColor: 'text-purple-600' },
  ];

  const attendanceCards = [
    { title: 'Present Today', value: stats.todayPresent, icon: ClipboardCheck, gradient: 'from-emerald-500/10 to-emerald-600/10', iconColor: 'text-emerald-600' },
    { title: 'Absent Today', value: stats.todayAbsent, icon: AlertTriangle, gradient: 'from-red-500/10 to-red-600/10', iconColor: 'text-red-600' },
    { title: 'Late Today', value: stats.todayLate, icon: AlertTriangle, gradient: 'from-yellow-500/10 to-yellow-600/10', iconColor: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Comprehensive overview of Smart Attendance Hub</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-xl text-primary font-medium">
          <Calendar className="h-4 w-4" />
          {format(new Date(), 'MMMM d, yyyy')}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((stat, i) => (
          <Card key={stat.title} className={cn("border-none shadow-md overflow-hidden relative group", stat.gradient)}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <stat.icon className="h-16 w-16" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? '...' : stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Today's Performance</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {attendanceCards.map((stat) => (
            <Card key={stat.title} className="border-l-4 border-l-primary/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? '...' : stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle>Attendance Summary</CardTitle>
            <CardDescription>Breakdown for {format(new Date(), 'EEEE')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <SummaryRow label="Present" value={stats.todayPresent} color="bg-emerald-500" textColor="text-emerald-600" />
              <SummaryRow label="Absent" value={stats.todayAbsent} color="bg-red-500" textColor="text-red-600" />
              <SummaryRow label="Late" value={stats.todayLate} color="bg-yellow-500" textColor="text-yellow-600" />
              <div className="p-6 flex items-center justify-between bg-primary/5">
                <span className="font-bold">Total Marked</span>
                <span className="text-2xl font-black text-primary">
                  {stats.todayPresent + stats.todayAbsent + stats.todayLate}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Administrative controls</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <QuickAction href="/students" label="Manage Students" desc="Add or edit student profiles" />
            <QuickAction href="/teachers" label="Manage Teachers" desc="Control faculty assignments" />
            <QuickAction href="/reports" label="Analytics & Reports" desc="Export attendance data" />
            <QuickAction href="/settings" label="System Settings" desc="Configure lock times & roles" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const SummaryRow = ({ label, value, color, textColor }: { label: string, value: number, color: string, textColor: string }) => (
  <div className="p-6 flex items-center justify-between group hover:bg-muted/50 transition-colors">
    <div className="flex items-center gap-3">
      <div className={cn("h-3 w-3 rounded-full", color)} />
      <span className="text-muted-foreground font-medium">{label}</span>
    </div>
    <span className={cn("text-xl font-bold", textColor)}>{value}</span>
  </div>
);

const QuickAction = ({ href, label, desc }: { href: string, label: string, desc: string }) => (
  <a href={href} className="flex flex-col p-4 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/50 transition-all group shadow-sm">
    <span className="font-bold group-hover:text-primary transition-colors">{label}</span>
    <span className="text-xs text-muted-foreground">{desc}</span>
  </a>
);

