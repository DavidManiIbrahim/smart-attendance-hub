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

interface ClassWithSections {
  id: string;
  name: string;
  grade_level: number;
  sections: { id: string; name: string }[];
  studentCount: number;
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassWithSections[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithSections | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [newSections, setNewSections] = useState('A, B');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { role } = useAuth();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const data = await api.get('/classes/full');
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load classes data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim() || !newGradeLevel) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const sectionNames = newSections.split(',').map(s => s.trim()).filter(s => s);

      await api.post('/classes', {
        name: newClassName.trim(),
        gradeLevel: newGradeLevel,
        sections: sectionNames,
      });

      toast({
        title: 'Success',
        description: 'Class created successfully',
      });

      setIsAddDialogOpen(false);
      setNewClassName('');
      setNewGradeLevel('');
      setNewSections('A, B');
      fetchClasses();
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create class',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClass = async () => {
    if (!editingClass || !editingClass.name.trim() || !editingClass.grade_level) return;

    setIsSubmitting(true);
    try {
      await api.put(`/classes/${editingClass.id}`, {
        name: editingClass.name.trim(),
        gradeLevel: editingClass.grade_level,
      });

      toast({
        title: 'Success',
        description: 'Class updated successfully',
      });

      setIsEditDialogOpen(false);
      fetchClasses();
    } catch (error) {
      console.error('Error updating class:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update class',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class? All associated sections and students will be affected.')) return;

    try {
      await api.delete(`/classes/${id}`);
      toast({
        title: 'Success',
        description: 'Class deleted successfully',
      });
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete class',
      });
    }
  };

  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
            <p className="text-muted-foreground">Manage classes and sections</p>
          </div>
          {role === 'admin' && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Class</DialogTitle>
                  <DialogDescription>Create a new class with sections</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="className">Class Name</Label>
                    <Input
                      id="className"
                      placeholder="e.g., Class 10"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Grade Level</Label>
                    <Input
                      id="gradeLevel"
                      type="number"
                      placeholder="e.g., 10"
                      min="1"
                      max="12"
                      value={newGradeLevel}
                      onChange={(e) => setNewGradeLevel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sections">Sections (comma-separated)</Label>
                    <Input
                      id="sections"
                      placeholder="e.g., A, B, C"
                      value={newSections}
                      onChange={(e) => setNewSections(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddClass} disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Class'}
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
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>Update class details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editClassName">Class Name</Label>
                <Input
                  id="editClassName"
                  value={editingClass?.name || ''}
                  onChange={(e) => setEditingClass(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editGradeLevel">Grade Level</Label>
                <Input
                  id="editGradeLevel"
                  type="number"
                  min="1"
                  max="12"
                  value={editingClass?.grade_level || ''}
                  onChange={(e) => setEditingClass(prev => prev ? { ...prev, grade_level: parseInt(e.target.value) } : null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditClass} disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Class'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>All Classes</CardTitle>
                <CardDescription>{filteredClasses.length} classes found</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search classes..."
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
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No classes found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class Name</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>Sections</TableHead>
                      <TableHead>Total Students</TableHead>
                      {role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map((cls) => (
                      <TableRow key={cls.id}>
                        <TableCell className="font-medium">{cls.name}</TableCell>
                        <TableCell>{cls.grade_level}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {cls.sections.length === 0 ? (
                              <span className="text-muted-foreground">None</span>
                            ) : (
                              cls.sections.map((section) => (
                                <Badge key={section.id} variant="secondary">
                                  {section.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{cls.studentCount}</TableCell>
                        {role === 'admin' && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingClass(cls);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClass(cls.id)}
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
