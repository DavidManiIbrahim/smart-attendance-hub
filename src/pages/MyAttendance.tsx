import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { CheckCircle, XCircle, Clock, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks: string | null;
}

interface MonthlyStats {
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}

export default function MyAttendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState<MonthlyStats>({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(new Date().getFullYear(), i, 1);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  useEffect(() => {
    if (user) {
      fetchAttendance();
    }
  }, [user, selectedMonth]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Get student record
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!student) {
        setLoading(false);
        return;
      }

      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

      const { data } = await supabase
        .from('attendance')
        .select('date, status, remarks')
        .eq('student_id', student.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date');

      const attendanceData = (data || []).map(a => ({
        ...a,
        status: a.status as 'present' | 'absent' | 'late',
      }));

      setAttendance(attendanceData);

      // Calculate stats
      const present = attendanceData.filter(a => a.status === 'present').length;
      const absent = attendanceData.filter(a => a.status === 'absent').length;
      const late = attendanceData.filter(a => a.status === 'late').length;
      const total = attendanceData.length;

      setStats({
        present,
        absent,
        late,
        total,
        percentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
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
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'absent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Generate calendar grid
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthDate = new Date(year, month - 1);
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  });

  const attendanceMap = new Map(attendance.map(a => [a.date, a]));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Attendance</h1>
            <p className="text-muted-foreground">View your attendance records</p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                stats.percentage >= 90 ? 'text-emerald-600' :
                stats.percentage >= 75 ? 'text-yellow-600' : 'text-red-600'
              )}>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>{format(monthDate, 'MMMM yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startOfMonth(monthDate).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}
                
                {daysInMonth.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const record = attendanceMap.get(dateStr);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  
                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        'p-2 rounded-lg border text-center',
                        record ? getStatusClass(record.status) : isWeekend ? 'bg-muted/50' : 'bg-card'
                      )}
                    >
                      <div className="text-sm font-medium">{format(day, 'd')}</div>
                      {record && (
                        <div className="flex justify-center mt-1">
                          {getStatusIcon(record.status)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detailed Records</CardTitle>
            <CardDescription>Your attendance history for {format(monthDate, 'MMMM yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records for this month
              </div>
            ) : (
              <div className="space-y-2">
                {attendance.map((record) => (
                  <div
                    key={record.date}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(record.status)}
                      <div>
                        <div className="font-medium">
                          {format(new Date(record.date), 'EEEE, MMMM d')}
                        </div>
                        {record.remarks && (
                          <div className="text-sm text-muted-foreground">{record.remarks}</div>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      'capitalize text-sm font-medium px-2 py-1 rounded',
                      getStatusClass(record.status)
                    )}>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
