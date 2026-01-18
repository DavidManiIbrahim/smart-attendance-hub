import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export default function Settings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/settings');
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev =>
      prev.map(s => (s.key === key ? { ...s, value } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/settings/bulk', { settings });

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };
  const getSettingLabel = (key: string) => {
    const labels: Record<string, string> = {
      school_name: 'School Name',
      attendance_lock_hours: 'Attendance Lock Time (hours)',
      low_attendance_threshold: 'Low Attendance Threshold (%)',
    };
    return labels[key] || key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure system settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>Manage application settings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-6">
                {settings.map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <Label htmlFor={setting.key}>{getSettingLabel(setting.key)}</Label>
                    <Input
                      id={setting.key}
                      value={setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                    />
                    {setting.description && (
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    )}
                  </div>
                ))}

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic Year</CardTitle>
            <CardDescription>Current academic year settings</CardDescription>
          </CardHeader>
          <CardContent>
            <AcademicYearSettings />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function AcademicYearSettings() {
  const [academicYear, setAcademicYear] = useState<{
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAcademicYear();
  }, []);

  const fetchAcademicYear = async () => {
    try {
      const data = await api.get('/academic-years/current');
      setAcademicYear(data);
    } catch (error) {
      console.error('Error fetching academic year:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!academicYear) {
    return <div className="text-muted-foreground">No academic year configured</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <Label className="text-muted-foreground">Name</Label>
        <p className="font-medium">{academicYear.name}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">Start Date</Label>
        <p className="font-medium">{academicYear.start_date}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">End Date</Label>
        <p className="font-medium">{academicYear.end_date}</p>
      </div>
    </div>
  );
}
