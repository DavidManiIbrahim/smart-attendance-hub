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
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Teacher {
  id: string;
  employee_id: string;
  department: string | null;
  qualification: string | null;
  joining_date: string | null;
  user_id: string;
  profile: { full_name: string; email: string; phone: string | null } | null;
  assignments: {
    class: { name: string } | null;
    section: { name: string } | null;
    is_class_teacher: boolean;
  }[];
}

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  const [teacherForm, setTeacherForm] = useState({
    fullName: '',
    email: '',
    password: '',
    employeeId: '',
    department: '',
    qualification: '',
    joiningDate: ''
  });

  const { toast } = useToast();
  const { role } = useAuth();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const data = await api.get('/teachers/detailed');
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load teachers data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async () => {
    if (!teacherForm.fullName || !teacherForm.email || !teacherForm.employeeId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Required fields missing' });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/teachers', teacherForm);
      toast({ title: 'Success', description: 'Teacher added' });
      setIsAddDialogOpen(false);
      resetForm();
      fetchTeachers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTeacher = async () => {
    if (!editingTeacherId) return;
    setIsSubmitting(true);
    try {
      await api.put(`/teachers/${editingTeacherId}`, teacherForm);
      toast({ title: 'Success', description: 'Teacher updated' });
      setIsEditDialogOpen(false);
      resetForm();
      fetchTeachers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Are you sure? This deletes the account too.')) return;
    try {
      await api.delete(`/teachers/${id}`);
      toast({ title: 'Success', description: 'Teacher removed' });
      fetchTeachers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const resetForm = () => {
    setTeacherForm({
      fullName: '',
      email: '',
      password: '',
      employeeId: '',
      department: '',
      qualification: '',
      joiningDate: ''
    });
    setEditingTeacherId(null);
  };

  const openEditDialog = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setTeacherForm({
      fullName: t.profile?.full_name || '',
      email: t.profile?.email || '',
      password: '',
      employeeId: t.employee_id,
      department: t.department || '',
      qualification: t.qualification || '',
      joiningDate: t.joining_date || ''
    });
    setIsEditDialogOpen(true);
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
            <p className="text-muted-foreground">Manage teacher records and assignments</p>
          </div>
          {role === 'admin' && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild><Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" />Add Teacher</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Add Teacher</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label>Full Name*</Label><Input value={teacherForm.fullName} onChange={e => setTeacherForm({ ...teacherForm, fullName: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>Email*</Label><Input type="email" value={teacherForm.email} onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>Employee ID*</Label><Input value={teacherForm.employeeId} onChange={e => setTeacherForm({ ...teacherForm, employeeId: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>Department</Label><Input value={teacherForm.department} onChange={e => setTeacherForm({ ...teacherForm, department: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddTeacher} disabled={isSubmitting}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Teacher</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label>Full Name*</Label><Input value={teacherForm.fullName} onChange={e => setTeacherForm({ ...teacherForm, fullName: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Email*</Label><Input type="email" value={teacherForm.email} onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Department</Label><Input value={teacherForm.department} onChange={e => setTeacherForm({ ...teacherForm, department: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Qualification</Label><Input value={teacherForm.qualification} onChange={e => setTeacherForm({ ...teacherForm, qualification: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditTeacher} disabled={isSubmitting}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>All Teachers</CardTitle>
                <CardDescription>{filteredTeachers.length} teachers found</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  className="pl-8 w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No teachers found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assigned Classes</TableHead>
                      {role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.employee_id}</TableCell>
                        <TableCell>{teacher.profile?.full_name || 'N/A'}</TableCell>
                        <TableCell>{teacher.profile?.email || 'N/A'}</TableCell>
                        <TableCell>{teacher.department || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.assignments.length === 0 ? (
                              <span className="text-muted-foreground">None</span>
                            ) : (
                              teacher.assignments.slice(0, 3).map((a, i) => (
                                <Badge key={i} variant={a.is_class_teacher ? 'default' : 'secondary'}>
                                  {a.class?.name || 'Cls'}-{a.section?.name || 'Sec'}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        {role === 'admin' && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(teacher)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteTeacher(teacher.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        )}
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
