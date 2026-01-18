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
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { role } = useAuth();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await api.get('/subjects');
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load subjects data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Subject name is required',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/subjects', {
        name: newSubjectName.trim(),
        code: newSubjectCode.trim() || null,
      });

      toast({
        title: 'Success',
        description: 'Subject created successfully',
      });

      setIsAddDialogOpen(false);
      setNewSubjectName('');
      setNewSubjectCode('');
      fetchSubjects();
    } catch (error) {
      console.error('Error creating subject:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create subject',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubject = async () => {
    if (!editingSubject || !editingSubject.name.trim()) return;

    setIsSubmitting(true);
    try {
      await api.put(`/subjects/${editingSubject.id}`, {
        name: editingSubject.name.trim(),
        code: editingSubject.code?.trim() || null,
      });

      toast({
        title: 'Success',
        description: 'Subject updated successfully',
      });

      setIsEditDialogOpen(false);
      fetchSubjects();
    } catch (error) {
      console.error('Error updating subject:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update subject',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      await api.delete(`/subjects/${id}`);
      toast({
        title: 'Success',
        description: 'Subject deleted successfully',
      });
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete subject',
      });
    }
  };

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
            <p className="text-muted-foreground">Manage academic subjects</p>
          </div>
          {role === 'admin' && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Subject</DialogTitle>
                  <DialogDescription>Create a new academic subject</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subjectName">Subject Name</Label>
                    <Input
                      id="subjectName"
                      placeholder="e.g., Mathematics"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subjectCode">Subject Code (optional)</Label>
                    <Input
                      id="subjectCode"
                      placeholder="e.g., MATH101"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSubject} disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Subject'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
              <DialogDescription>Update subject details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editSubjectName">Subject Name</Label>
                <Input
                  id="editSubjectName"
                  value={editingSubject?.name || ''}
                  onChange={(e) => setEditingSubject(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSubjectCode">Subject Code</Label>
                <Input
                  id="editSubjectCode"
                  value={editingSubject?.code || ''}
                  onChange={(e) => setEditingSubject(prev => prev ? { ...prev, code: e.target.value } : null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSubject} disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Subject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>All Subjects</CardTitle>
                <CardDescription>{filteredSubjects.length} subjects found</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subjects..."
                  className="pl-8 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredSubjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subjects found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Code</TableHead>
                      {role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>{subject.code || 'N/A'}</TableCell>
                        {role === 'admin' && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingSubject(subject);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteSubject(subject.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
