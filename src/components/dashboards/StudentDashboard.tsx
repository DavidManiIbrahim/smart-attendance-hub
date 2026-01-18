import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, CheckCircle, XCircle, Clock, Award, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
      const data = await api.get('/student/dashboard-stats');

      setStudentInfo({
        name: data.studentInfo.fullName,
        className: data.studentInfo.className || 'N/A',
        section: data.studentInfo.sectionName || 'N/A',
        rollNumber: data.studentInfo.rollNumber || 'N/A',
      });

      setStats(data.stats);
      setRecentAttendance(data.recentAttendance);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!studentInfo) {
    return (
      <Card className="max-w-md mx-auto mt-12 text-center p-8">
        <CardHeader>
          <div className="mx-auto bg-muted p-4 rounded-full w-fit mb-4">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Student Record Not Found</CardTitle>
          <CardDescription>
            Your account is registered but hasn't been linked to a specific class. Please contact your teacher or administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Welcome, {studentInfo.name.split(' ')[0]}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5"><Target className="h-3 w-3" /> Class {studentInfo.className} - {studentInfo.section}</span>
              <span className="flex items-center gap-1.5">Roll No: {studentInfo.rollNumber}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 shadow-md hover:shadow-lg transition-shadow border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-4xl font-black", getPercentageColor(stats.percentage))}>
              {stats.percentage}%
            </div>
            <Progress value={stats.percentage} className="mt-4 h-2 bg-muted/50" />
            <p className="text-[10px] mt-2 text-muted-foreground uppercase font-bold tracking-wider">Current Month Rating</p>
          </CardContent>
        </Card>

        <StatSummary title="Present" value={stats.present} icon={CheckCircle} color="text-emerald-500" />
        <StatSummary title="Absent" value={stats.absent} icon={XCircle} color="text-red-500" />
        <StatSummary title="Late" value={stats.late} icon={Clock} color="text-yellow-500" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 overflow-hidden shadow-lg border-none">
          <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Presence</CardTitle>
              <CardDescription>Your last 10 records for this month</CardDescription>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground opacity-30" />
          </CardHeader>
          <CardContent className="p-0">
            {recentAttendance.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground italic">No attendance marked yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {recentAttendance.map((record) => (
                  <div key={record.date} className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
                    <span className="font-bold text-sm">
                      {format(new Date(record.date), 'EEEE, MMMM d')}
                    </span>
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter",
                      record.status === 'present' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
                      record.status === 'absent' && "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
                      record.status === 'late' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                    )}>
                      {getStatusIcon(record.status)}
                      {record.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle>Quick Insight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm opacity-80 leading-relaxed font-medium">
                Keep your attendance above <strong>75%</strong> to maintain good academic standing. You are currently doing <strong>{stats.percentage >= 75 ? 'great' : 'not so well'}</strong>.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase opacity-60 mb-1">Total Classes</p>
              <p className="text-2xl font-black">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const StatSummary = ({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) => (
  <Card className="border-none shadow-md hover:shadow-lg transition-transform hover:-translate-y-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
      <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">{title}</CardTitle>
      <Icon className={cn("h-4 w-4", color)} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-black">{value}</div>
      <p className="text-[10px] text-muted-foreground mt-1">Total days</p>
    </CardContent>
  </Card>
);

