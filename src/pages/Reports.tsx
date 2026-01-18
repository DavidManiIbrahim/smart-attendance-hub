import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Class {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  class_id: string;
}

interface StudentReport {
  id: string;
  name: string;
  rollNumber: string;
  admissionNumber: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}

export default function Reports() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [report, setReport] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [summaryStats, setSummaryStats] = useState({
    avgAttendance: 0,
    belowThreshold: 0,
    totalStudents: 0,
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const [classesRes, sectionsRes] = await Promise.all([
      supabase.from('classes').select('id, name').order('grade_level'),
      supabase.from('sections').select('id, name, class_id'),
    ]);
    setClasses(classesRes.data || []);
    setSections(sectionsRes.data || []);
  };

  const generateReport = async () => {
    if (!selectedClass || !selectedSection) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select a class and section',
      });
      return;
    }

    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch students
      const { data: students } = await supabase
        .from('students')
        .select('id, admission_number, roll_number, user_id')
        .eq('class_id', selectedClass)
        .eq('section_id', selectedSection)
        .eq('is_active', true)
        .order('roll_number');

      if (!students || students.length === 0) {
        setReport([]);
        setSummaryStats({ avgAttendance: 0, belowThreshold: 0, totalStudents: 0 });
        setLoading(false);
        return;
      }

      // Fetch profiles
      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch attendance
      const studentIds = students.map(s => s.id);
      const { data: attendance } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)
        .gte('date', fromDate)
        .lte('date', toDate);

      // Aggregate attendance by student
      const attendanceMap = new Map<string, { present: number; absent: number; late: number }>();
      attendance?.forEach(a => {
        const existing = attendanceMap.get(a.student_id) || { present: 0, absent: 0, late: 0 };
        if (a.status === 'present') existing.present++;
        else if (a.status === 'absent') existing.absent++;
        else if (a.status === 'late') existing.late++;
        attendanceMap.set(a.student_id, existing);
      });

      const reportData: StudentReport[] = students.map(student => {
        const stats = attendanceMap.get(student.id) || { present: 0, absent: 0, late: 0 };
        const total = stats.present + stats.absent + stats.late;
        const percentage = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 0;

        return {
          id: student.id,
          name: profilesMap.get(student.user_id)?.full_name || 'N/A',
          rollNumber: student.roll_number || 'N/A',
          admissionNumber: student.admission_number,
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
          total,
          percentage,
        };
      });

      setReport(reportData);

      // Calculate summary
      const totalPercentage = reportData.reduce((sum, r) => sum + r.percentage, 0);
      const avgAttendance = reportData.length > 0 ? Math.round(totalPercentage / reportData.length) : 0;
      const belowThreshold = reportData.filter(r => r.percentage < 75).length;

      setSummaryStats({
        avgAttendance,
        belowThreshold,
        totalStudents: reportData.length,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate report',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (report.length === 0) return;

    const headers = ['Roll No', 'Admission No', 'Name', 'Present', 'Absent', 'Late', 'Total', 'Percentage'];
    const rows = report.map(r => [
      r.rollNumber,
      r.admissionNumber,
      r.name,
      r.present,
      r.absent,
      r.late,
      r.total,
      `${r.percentage}%`,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSections = sections.filter(s => s.class_id === selectedClass);

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Reports</h1>
          <p className="text-muted-foreground">Generate and export attendance reports</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Parameters</CardTitle>
            <CardDescription>Select class, section, and date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={(v) => {
                  setSelectedClass(v);
                  setSelectedSection('');
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateRange.from, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateRange.to, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={generateReport} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {report.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold", getPercentageColor(summaryStats.avgAttendance))}>
                    {summaryStats.avgAttendance}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Below 75%</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{summaryStats.belowThreshold}</div>
                  <p className="text-xs text-muted-foreground">students need attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryStats.totalStudents}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Attendance Report</CardTitle>
                    <CardDescription>
                      {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={exportToCSV}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead>Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.rollNumber}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell className="text-center text-emerald-600">{student.present}</TableCell>
                          <TableCell className="text-center text-red-600">{student.absent}</TableCell>
                          <TableCell className="text-center text-yellow-600">{student.late}</TableCell>
                          <TableCell className="text-center">{student.total}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={student.percentage} className="w-[60px]" />
                              <span className={cn("font-medium", getPercentageColor(student.percentage))}>
                                {student.percentage}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
