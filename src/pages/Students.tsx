import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Eye } from 'lucide-react';

interface Student {
  id: string;
  admission_number: string;
  roll_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  is_active: boolean;
  class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  profile: { full_name: string; email: string } | null;
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

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsData, classesData, sectionsData] = await Promise.all([
        api.get('/students/detailed'),
        api.get('/classes'),
        api.get('/sections'),
      ]);

      setStudents(studentsData || []);
      setClasses(classesData || []);
      setSections(sectionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load students data',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.admission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = filterClass === 'all' || student.class?.id === filterClass;
    const matchesSection = filterSection === 'all' || student.section?.id === filterSection;

    return matchesSearch && matchesClass && matchesSection;
  });

  const filteredSections = filterClass === 'all'
    ? sections
    : sections.filter(s => s.class_id === filterClass);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground">Manage student records</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>All Students</CardTitle>
                <CardDescription>{filteredStudents.length} students found</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    className="pl-8 w-[200px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterClass} onValueChange={(v) => {
                  setFilterClass(v);
                  setFilterSection('all');
                }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {filteredSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adm. No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Roll No.</TableHead>
                      <TableHead>Parent Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.admission_number}</TableCell>
                        <TableCell>{student.profile?.full_name || 'N/A'}</TableCell>
                        <TableCell>{student.class?.name || 'N/A'}</TableCell>
                        <TableCell>{student.section?.name || 'N/A'}</TableCell>
                        <TableCell>{student.roll_number || 'N/A'}</TableCell>
                        <TableCell>{student.parent_phone || 'N/A'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${student.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedStudent(student)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Student Details</DialogTitle>
                                <DialogDescription>
                                  Admission No: {student.admission_number}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">Name</Label>
                                    <p className="font-medium">{student.profile?.full_name || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p className="font-medium">{student.profile?.email || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Class</Label>
                                    <p className="font-medium">{student.class?.name || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Section</Label>
                                    <p className="font-medium">{student.section?.name || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Roll Number</Label>
                                    <p className="font-medium">{student.roll_number || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Gender</Label>
                                    <p className="font-medium capitalize">{student.gender || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Date of Birth</Label>
                                    <p className="font-medium">{student.date_of_birth || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Parent Name</Label>
                                    <p className="font-medium">{student.parent_name || 'N/A'}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-muted-foreground">Parent Phone</Label>
                                    <p className="font-medium">{student.parent_phone || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
