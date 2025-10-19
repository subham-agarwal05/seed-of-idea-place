import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";

interface UploadApplicantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
}

const UploadApplicantsDialog = ({ open, onOpenChange, testId }: UploadApplicantsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const applicants = jsonData.map((row: any) => ({
          test_id: testId,
          roll_number: row["roll_number"] || row["Roll Number"] || row["ROLL NUMBER"] || "",
          name: row["name"] || row["Name"] || row["NAME"] || "",
          email: row["email"] || row["Email"] || row["EMAIL"] || null,
          phone: row["phone"] || row["Phone"] || row["PHONE"] || null,
        })).filter((applicant) => applicant.roll_number && applicant.name);

        if (applicants.length === 0) {
          toast({
            title: "Error",
            description: "No valid data found in the Excel file. Make sure columns 'roll_number' and 'name' exist.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Remove duplicates within the file itself
        const uniqueApplicants = Array.from(
          new Map(applicants.map((app) => [app.roll_number, app])).values()
        );

        const { error } = await supabase
          .from("applicants")
          .upsert(uniqueApplicants, {
            onConflict: "test_id,roll_number",
            ignoreDuplicates: false,
          });

        if (error) throw error;

        const duplicatesRemoved = applicants.length - uniqueApplicants.length;
        const message = duplicatesRemoved > 0
          ? `${uniqueApplicants.length} applicants uploaded/updated successfully (${duplicatesRemoved} duplicates removed)`
          : `${uniqueApplicants.length} applicants uploaded/updated successfully`;

        toast({
          title: "Success",
          description: message,
        });

        onOpenChange(false);
        setFile(null);
      };

      reader.readAsBinaryString(file);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Applicants</DialogTitle>
          <DialogDescription>
            Upload an Excel file with applicant data. Required columns: roll_number, name
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Excel File</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Excel columns: roll_number (required), name (required), email (optional), phone (optional)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadApplicantsDialog;
