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
  DialogFooter,
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
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  classId?: string;
  sectionId?: string;
}

interface Class {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  classId: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [studentForm, setStudentForm] = useState({
    fullName: '',
    email: '',
    password: '',
    admissionNumber: '',
    rollNumber: '',
    classId: '',
    sectionId: '',
    gender: 'male',
    parentName: '',
    parentPhone: '',
    isActive: true
  });

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const { toast } = useToast();
  const { role } = useAuth();

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

  const handleAddStudent = async () => {
    if (!studentForm.fullName || !studentForm.email || !studentForm.admissionNumber) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/students', studentForm);
      toast({ title: 'Success', description: 'Student created successfully' });
      setIsAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to create student' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = async () => {
    if (!editingStudentId) return;

    setIsSubmitting(true);
    try {
      await api.put(`/students/${editingStudentId}`, studentForm);
      toast({ title: 'Success', description: 'Student updated successfully' });
      setIsEditDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update student' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student? This will also delete their account.')) return;

    try {
      await api.delete(`/students/${id}`);
      toast({ title: 'Success', description: 'Student deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete student' });
    }
  };

  const resetForm = () => {
    setStudentForm({
      fullName: '',
      email: '',
      password: '',
      admissionNumber: '',
      rollNumber: '',
      classId: '',
      sectionId: '',
      gender: 'male',
      parentName: '',
      parentPhone: '',
      isActive: true
    });
    setEditingStudentId(null);
  };

  const openEditDialog = (student: Student) => {
    setEditingStudentId(student.id);
    setStudentForm({
      fullName: student.profile?.full_name || '',
      email: student.profile?.email || '',
      password: '', // Don't show password
      admissionNumber: student.admission_number,
      rollNumber: student.roll_number || '',
      classId: student.class?.id || '',
      sectionId: student.section?.id || '',
      gender: student.gender || 'male',
      parentName: student.parent_name || '',
      parentPhone: student.parent_phone || '',
      isActive: student.is_active
    });
    setIsEditDialogOpen(true);
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
    : sections.filter(s => s.classId === filterClass);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground">Manage student records</p>
          </div>
          {role === 'admin' && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>Create a new student record and user account</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name*</Label>
                    <Input value={studentForm.fullName} onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email*</Label>
                    <Input type="email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password (default: password123)</Label>
                    <Input type="password" placeholder="Leave blank for default" value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Admission Number*</Label>
                    <Input value={studentForm.admissionNumber} onChange={e => setStudentForm({ ...studentForm, admissionNumber: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={studentForm.classId} onValueChange={v => setStudentForm({ ...studentForm, classId: v, sectionId: '' })}>
                      <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select value={studentForm.sectionId} onValueChange={v => setStudentForm({ ...studentForm, sectionId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                      <SelectContent>
                        {sections.filter(s => s.classId === studentForm.classId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Roll Number</Label>
                    <Input value={studentForm.rollNumber} onChange={e => setStudentForm({ ...studentForm, rollNumber: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={studentForm.gender} onValueChange={v => setStudentForm({ ...studentForm, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Name</Label>
                    <Input value={studentForm.parentName} onChange={e => setStudentForm({ ...studentForm, parentName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Phone</Label>
                    <Input value={studentForm.parentPhone} onChange={e => setStudentForm({ ...studentForm, parentPhone: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddStudent} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Student'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Update student record</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Full Name*</Label>
                <Input value={studentForm.fullName} onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email*</Label>
                <Input type="email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Admission Number*</Label>
                <Input value={studentForm.admissionNumber} onChange={e => setStudentForm({ ...studentForm, admissionNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={studentForm.classId} onValueChange={v => setStudentForm({ ...studentForm, classId: v, sectionId: '' })}>
                  <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={studentForm.sectionId} onValueChange={v => setStudentForm({ ...studentForm, sectionId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                  <SelectContent>
                    {sections.filter(s => s.classId === studentForm.classId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Roll Number</Label>
                <Input value={studentForm.rollNumber} onChange={e => setStudentForm({ ...studentForm, rollNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Parent Name</Label>
                <Input value={studentForm.parentName} onChange={e => setStudentForm({ ...studentForm, parentName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Parent Phone</Label>
                <Input value={studentForm.parentPhone} onChange={e => setStudentForm({ ...studentForm, parentPhone: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={studentForm.isActive} onChange={e => setStudentForm({ ...studentForm, isActive: e.target.checked })} />
                <Label>Is Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditStudent} disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update Student'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${student.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteStudent(student.id)}><Trash2 className="h-4 w-4" /></Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Student Details</DialogTitle>
                                  <DialogDescription>Adm No: {student.admission_number}</DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                  <div><Label className="text-muted-foreground">Name</Label><p>{student.profile?.full_name}</p></div>
                                  <div><Label className="text-muted-foreground">Email</Label><p>{student.profile?.email}</p></div>
                                  <div><Label className="text-muted-foreground">Parent</Label><p>{student.parent_name}</p></div>
                                  <div><Label className="text-muted-foreground">Phone</Label><p>{student.parent_phone}</p></div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
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
