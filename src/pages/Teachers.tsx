import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';

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
  const { toast } = useToast();

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
        </div>

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
                      <TableHead>Contact</TableHead>
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
                                  {a.class?.name}-{a.section?.name}
                                  {a.is_class_teacher && ' (CT)'}
                                </Badge>
                              ))
                            )}
                            {teacher.assignments.length > 3 && (
                              <Badge variant="outline">+{teacher.assignments.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{teacher.profile?.phone || 'N/A'}</TableCell>
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
