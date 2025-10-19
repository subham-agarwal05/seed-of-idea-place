import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, ClipboardCheck, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    campaigns: 0,
    tests: 0,
    attendanceToday: 0,
    totalApplicants: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchStats = async () => {
    try {
      const [campaignsRes, testsRes, applicantsRes] = await Promise.all([
        supabase.from("campaigns").select("id", { count: "exact" }),
        supabase.from("tests").select("id", { count: "exact" }),
        supabase.from("applicants").select("id", { count: "exact" }),
      ]);

      setStats({
        campaigns: campaignsRes.count || 0,
        tests: testsRes.count || 0,
        attendanceToday: 0,
        totalApplicants: applicantsRes.count || 0,
      });
    } catch (error: any) {
      toast({
        title: "Error loading stats",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Active Campaigns",
      value: stats.campaigns,
      icon: Calendar,
      description: "Total placement campaigns",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Total Tests",
      value: stats.tests,
      icon: ClipboardCheck,
      description: "Tests scheduled",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: "Attendance Today",
      value: stats.attendanceToday,
      icon: Users,
      description: "Students marked present",
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "Total Applicants",
      value: stats.totalApplicants,
      icon: BarChart3,
      description: "Registered applicants",
      gradient: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <DashboardLayout activeTab="dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your placement tests.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? "..." : stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => navigate("/campaigns")}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">Create New Campaign</div>
                <div className="text-sm text-muted-foreground">Start a new placement cycle</div>
              </button>
              <button
                onClick={() => navigate("/attendance")}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">Mark Attendance</div>
                <div className="text-sm text-muted-foreground">Scan student IDs and mark attendance</div>
              </button>
              <button
                onClick={() => navigate("/users")}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">Manage Volunteers</div>
                <div className="text-sm text-muted-foreground">Add or edit volunteer accounts</div>
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-8">
                No recent activity to display
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
