import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Upload, Download, MapPin } from "lucide-react";
import UploadApplicantsDialog from "./UploadApplicantsDialog";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

interface Test {
  id: string;
  name: string;
  test_date: string;
  test_time: string;
  duration_minutes: number;
  cycles: {
    name: string;
  };
}

interface TestsListProps {
  campaignId: string;
}

const TestsList = ({ campaignId }: TestsListProps) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
  }, [campaignId]);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from("tests")
        .select(`
          id,
          name,
          test_date,
          test_time,
          duration_minutes,
          cycles (name)
        `)
        .eq("campaign_id", campaignId)
        .order("test_date", { ascending: true });

      if (error) throw error;
      setTests(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading tests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (testId: string) => {
    setSelectedTestId(testId);
    setUploadDialogOpen(true);
  };

  const handleExportAttendance = async (testId: string, testName: string) => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          marked_at,
          status,
          applicants (
            roll_number,
            name,
            email,
            phone
          )
        `)
        .eq("test_id", testId);

      if (error) throw error;

      const exportData = (data || []).map((record: any) => ({
        "Roll Number": record.applicants.roll_number,
        "Name": record.applicants.name,
        "Email": record.applicants.email || "",
        "Phone": record.applicants.phone || "",
        "Status": record.status,
        "Marked At": new Date(record.marked_at).toLocaleString(),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");

      XLSX.writeFile(wb, `${testName.replace(/\s+/g, "_")}_Attendance.xlsx`);

      toast({
        title: "Success",
        description: "Attendance data exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading tests...</div>;
  }

  if (tests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No tests yet</h3>
          <p className="text-sm text-muted-foreground">
            Create your first test to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {tests.map((test) => (
          <Card key={test.id}>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-1">{test.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Cycle: {test.cycles?.name || "N/A"}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(test.test_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{test.test_time} ({test.duration_minutes} min)</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUploadClick(test.id)}
                >
                  <Upload className="h-3 w-3 mr-2" />
                  Upload List
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportAttendance(test.id, test.name)}
                >
                  <Download className="h-3 w-3 mr-2" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/tests/${test.id}/seating`)}
                >
                  <MapPin className="h-3 w-3 mr-2" />
                  Seating
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <UploadApplicantsDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        testId={selectedTestId}
      />
    </>
  );
};

export default TestsList;
