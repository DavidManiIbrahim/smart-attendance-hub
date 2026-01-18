import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle, Users, BarChart3, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Smart Attendance Hub</span>
          </div>
          <Button onClick={() => navigate("/auth")} variant="ghost" className="font-medium">
            Login
          </Button>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-30">
            <div className="absolute top-0 left-20 w-96 h-96 bg-primary rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-20 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
          </div>

          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Modern Attendance Management
              </h1>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                Streamline your institution's attendance tracking with our comprehensive,
                secure, and intuitive platform designed for modern education.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto px-8 py-6 text-lg rounded-full">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-lg rounded-full">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Features Built for Excellence</h2>
              <p className="text-muted-foreground">Everything you need to manage attendance in one place.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<CheckCircle className="h-8 w-8 text-primary" />}
                title="Easy Tracking"
                description="Mark attendance for entire classes in seconds with our optimized interface."
              />
              <FeatureCard
                icon={<BarChart3 className="h-8 w-8 text-primary" />}
                title="Detailed Reports"
                description="Generate comprehensive PDF reports for students, classes, and subjects."
              />
              <FeatureCard
                icon={<Users className="h-8 w-8 text-primary" />}
                title="Role Management"
                description="Custom dashboards for admins, teachers, and students with specific controls."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-card">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold">Smart Attendance Hub</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Smart Attendance Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="p-8 rounded-3xl bg-card border hover:shadow-xl transition-all group">
    <div className="mb-6 p-3 rounded-2xl bg-primary/5 w-fit group-hover:bg-primary/10 transition-colors">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

export default Index;

