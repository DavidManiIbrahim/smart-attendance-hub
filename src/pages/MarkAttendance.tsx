import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle, XCircle, Clock, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'late';

interface Student {
  id: string;
  admission_number: string;
  roll_number: string | null;
  profile: { full_name: string } | null;
  status: AttendanceStatus;
  remarks: string;
}

interface Class {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  class_id: string;
}

export default function MarkAttendance() {
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSection && selectedDate) {
      fetchStudents();
      checkLock();
    }
  }, [selectedClass, selectedSection, selectedDate]);

  const fetchClasses = async () => {
    try {
      if (role === 'admin') {
        const { data } = await supabase.from('classes').select('id, name').order('grade_level');
        setClasses(data || []);
      } else {
        // For teachers, fetch only assigned classes
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (teacher) {
          const { data: assignments } = await supabase
            .from('teacher_assignments')
            .select('class:classes(id, name)')
            .eq('teacher_id', teacher.id);

          const uniqueClasses = new Map<string, Class>();
          assignments?.forEach(a => {
            if (a.class && !uniqueClasses.has(a.class.id)) {
              uniqueClasses.set(a.class.id, a.class);
            }
          });
          setClasses(Array.from(uniqueClasses.values()));
        }
      }

      const { data: sectionsData } = await supabase.from('sections').select('id, name, class_id');
      setSections(sectionsData || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Fetch students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, admission_number, roll_number, user_id')
        .eq('class_id', selectedClass)
        .eq('section_id', selectedSection)
        .eq('is_active', true)
        .order('roll_number');

      if (!studentsData) {
        setStudents([]);
        return;
      }

      // Fetch profiles
      const userIds = studentsData.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch existing attendance
      const studentIds = studentsData.map(s => s.id);
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('student_id, status, remarks')
        .eq('date', dateStr)
        .in('student_id', studentIds);

      const attendanceMap = new Map(existingAttendance?.map(a => [a.student_id, a]) || []);

      const studentsWithAttendance = studentsData.map(student => ({
        id: student.id,
        admission_number: student.admission_number,
        roll_number: student.roll_number,
        profile: profilesMap.get(student.user_id) || null,
        status: (attendanceMap.get(student.id)?.status as AttendanceStatus) || 'present',
        remarks: attendanceMap.get(student.id)?.remarks || '',
      }));

      setStudents(studentsWithAttendance);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLock = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('attendance_locks')
        .select('id')
        .eq('class_id', selectedClass)
        .eq('section_id', selectedSection)
        .eq('date', dateStr)
        .maybeSingle();

      setIsLocked(!!data);
    } catch (error) {
      console.error('Error checking lock:', error);
    }
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, status } : s))
    );
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, remarks } : s))
    );
  };

  const markAllAs = (status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSave = async () => {
    if (isLocked && role !== 'admin') {
      toast({
        variant: 'destructive',
        title: 'Locked',
        description: 'Attendance for this date is locked',
      });
      return;
    }

    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Upsert attendance records
      const attendanceRecords = students.map(student => ({
        student_id: student.id,
        date: dateStr,
        status: student.status,
        remarks: student.remarks || null,
        marked_by: user!.id,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceRecords, { onConflict: 'student_id,date' });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Attendance saved successfully',
      });
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save attendance',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredSections = sections.filter(s => s.class_id === selectedClass);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mark Attendance</h1>
          <p className="text-muted-foreground">Record daily attendance for students</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Class & Date</CardTitle>
            <CardDescription>Choose the class, section, and date to mark attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={(v) => {
                  setSelectedClass(v);
                  setSelectedSection('');
                  setStudents([]);
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
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[180px] justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedClass && selectedSection && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Attendance</CardTitle>
                  <CardDescription>
                    {students.length} students | {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    {isLocked && <span className="ml-2 text-yellow-600">(Locked)</span>}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => markAllAs('present')}>
                    All Present
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => markAllAs('absent')}>
                    All Absent
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading students...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students found in this class/section
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <div className="grid grid-cols-12 gap-4 p-4 font-medium border-b bg-muted/50">
                      <div className="col-span-1">Roll</div>
                      <div className="col-span-3">Student Name</div>
                      <div className="col-span-4">Status</div>
                      <div className="col-span-4">Remarks</div>
                    </div>
                    {students.map((student) => (
                      <div key={student.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center">
                        <div className="col-span-1 text-sm font-medium">
                          {student.roll_number || '-'}
                        </div>
                        <div className="col-span-3">
                          <div className="font-medium">{student.profile?.full_name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{student.admission_number}</div>
                        </div>
                        <div className="col-span-4">
                          <div className="flex gap-2">
                            <Button
                              variant={student.status === 'present' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateStatus(student.id, 'present')}
                              disabled={isLocked && role !== 'admin'}
                              className={student.status === 'present' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Present
                            </Button>
                            <Button
                              variant={student.status === 'absent' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateStatus(student.id, 'absent')}
                              disabled={isLocked && role !== 'admin'}
                              className={student.status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Absent
                            </Button>
                            <Button
                              variant={student.status === 'late' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateStatus(student.id, 'late')}
                              disabled={isLocked && role !== 'admin'}
                              className={student.status === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Late
                            </Button>
                          </div>
                        </div>
                        <div className="col-span-4">
                          <Textarea
                            placeholder="Add remarks..."
                            className="min-h-[40px] resize-none"
                            value={student.remarks}
                            onChange={(e) => updateRemarks(student.id, e.target.value)}
                            disabled={isLocked && role !== 'admin'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving || (isLocked && role !== 'admin')}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Attendance
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
