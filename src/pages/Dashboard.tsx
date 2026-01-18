import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import TeacherDashboard from '@/components/dashboards/TeacherDashboard';
import StudentDashboard from '@/components/dashboards/StudentDashboard';

export default function Dashboard() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      {role === 'admin' && <AdminDashboard />}
      {role === 'teacher' && <TeacherDashboard />}
      {role === 'student' && <StudentDashboard />}
      {!role && (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">No Role Assigned</h2>
          <p className="text-muted-foreground mt-2">
            Please contact an administrator to assign you a role.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
