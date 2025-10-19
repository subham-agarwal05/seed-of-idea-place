import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScanBarcode, UserCheck, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface Test {
  id: string;
  name: string;
  test_date: string;
}

const Attendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    checkAuth();
    fetchTests();
  }, []);

  useEffect(() => {
    if (scanning) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [scanning]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from("tests")
        .select("id, name, test_date")
        .gte("test_date", new Date().toISOString().split("T")[0])
        .order("test_date", { ascending: true });

      if (error) throw error;
      setTests(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading tests",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markAttendance = async () => {
    if (!selectedTest || !rollNumber) {
      toast({
        title: "Missing information",
        description: "Please select a test and enter roll number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Find applicant
      const { data: applicant, error: applicantError } = await supabase
        .from("applicants")
        .select("id")
        .eq("test_id", selectedTest)
        .eq("roll_number", rollNumber)
        .single();

      if (applicantError || !applicant) {
        toast({
          title: "Student not found",
          description: "No applicant with this roll number for the selected test",
          variant: "destructive",
        });
        return;
      }

      // Check if already marked
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("applicant_id", applicant.id)
        .eq("test_id", selectedTest)
        .single();

      if (existing) {
        toast({
          title: "Already marked",
          description: "Attendance already recorded for this student",
          variant: "destructive",
        });
        setRollNumber("");
        return;
      }

      // Mark attendance
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("attendance").insert({
        applicant_id: applicant.id,
        test_id: selectedTest,
        marked_by: user?.id,
        status: "present",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });

      setRollNumber("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      markAttendance();
    }
  };

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("barcode-scanner");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setRollNumber(decodedText);
          setScanning(false);
          toast({
            title: "Scanned successfully",
            description: `Roll number: ${decodedText}`,
          });
        },
        () => {
          // Ignore errors during scanning
        }
      );
    } catch (error: any) {
      toast({
        title: "Camera error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
  };

  return (
    <DashboardLayout activeTab="attendance">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mark Attendance</h2>
          <p className="text-muted-foreground">
            Scan student ID cards or enter roll numbers manually
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Scanner</CardTitle>
              <CardDescription>Select test and scan student IDs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Test</label>
                <Select value={selectedTest} onValueChange={setSelectedTest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a test" />
                  </SelectTrigger>
                  <SelectContent>
                    {tests.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.name} - {new Date(test.test_date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Roll Number</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter or scan roll number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={!selectedTest || scanning}
                    autoFocus={!scanning}
                  />
                  <Button
                    size="icon"
                    variant={scanning ? "default" : "outline"}
                    onClick={() => setScanning(!scanning)}
                    disabled={!selectedTest}
                  >
                    {scanning ? <X className="h-4 w-4" /> : <ScanBarcode className="h-4 w-4" />}
                  </Button>
                </div>
                {scanning && (
                  <div className="mt-4 p-4 border rounded-lg bg-background">
                    <div id="barcode-scanner" className="w-full" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {scanning ? "Point camera at barcode" : "Scan barcode or type roll number and press Enter"}
                </p>
              </div>

              <Button
                className="w-full"
                onClick={markAttendance}
                disabled={loading || !selectedTest || !rollNumber}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {loading ? "Marking..." : "Mark Present"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
              <CardDescription>How to mark attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <div className="font-medium">Select the test</div>
                  <div className="text-muted-foreground text-xs">
                    Choose the test for which you want to mark attendance
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <div className="font-medium">Scan or enter roll number</div>
                  <div className="text-muted-foreground text-xs">
                    Use a barcode scanner or type the roll number manually
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <div className="font-medium">Confirm attendance</div>
                  <div className="text-muted-foreground text-xs">
                    Press Enter or click the button to mark student as present
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
