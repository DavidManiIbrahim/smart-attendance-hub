import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  School,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['admin', 'teacher', 'student'] },
  { label: 'Students', href: '/students', icon: <Users className="h-5 w-5" />, roles: ['admin', 'teacher'] },
  { label: 'Teachers', href: '/teachers', icon: <UserCheck className="h-5 w-5" />, roles: ['admin'] },
  { label: 'Classes', href: '/classes', icon: <School className="h-5 w-5" />, roles: ['admin'] },
  { label: 'Subjects', href: '/subjects', icon: <BookOpen className="h-5 w-5" />, roles: ['admin'] },
  { label: 'Mark Attendance', href: '/attendance/mark', icon: <ClipboardList className="h-5 w-5" />, roles: ['admin', 'teacher'] },
  { label: 'My Attendance', href: '/attendance/my', icon: <ClipboardList className="h-5 w-5" />, roles: ['student'] },
  { label: 'Reports', href: '/reports', icon: <BarChart3 className="h-5 w-5" />, roles: ['admin', 'teacher'] },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" />, roles: ['admin'] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredNavItems = navItems.filter((item) => role && item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="hidden font-semibold sm:inline-block">Smart Attendance Hub</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline-block capitalize">
              {role}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.user_metadata?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
          <nav className="flex flex-col gap-1 p-4">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="fixed inset-y-0 left-0 w-64 border-r bg-card pt-16">
              <nav className="flex flex-col gap-1 p-4">
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
