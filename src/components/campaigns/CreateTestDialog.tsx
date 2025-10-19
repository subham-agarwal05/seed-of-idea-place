import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

interface Cycle {
  id: string;
  name: string;
  cycle_number: number;
}

const CreateTestDialog = ({ open, onOpenChange, campaignId }: CreateTestDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCycles();
    }
  }, [open, campaignId]);

  const fetchCycles = async () => {
    try {
      const { data, error } = await supabase
        .from("cycles")
        .select("id, name, cycle_number")
        .eq("campaign_id", campaignId)
        .order("cycle_number", { ascending: true });

      if (error) throw error;
      setCycles(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading cycles",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const testDate = formData.get("test_date") as string;
    const testTime = formData.get("test_time") as string;
    const duration = parseInt(formData.get("duration") as string);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("tests").insert({
        campaign_id: campaignId,
        cycle_id: selectedCycle,
        name,
        test_date: testDate,
        test_time: testTime,
        duration_minutes: duration,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test created successfully",
      });

      onOpenChange(false);
      window.location.reload();
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
          <DialogTitle>Create New Test</DialogTitle>
          <DialogDescription>
            Schedule a new placement test
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Test Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Aptitude Test"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycle">Cycle</Label>
              <Select value={selectedCycle} onValueChange={setSelectedCycle} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name} (Cycle {cycle.cycle_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test_date">Test Date</Label>
                <Input
                  id="test_date"
                  name="test_date"
                  type="date"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test_time">Start Time</Label>
                <Input
                  id="test_time"
                  name="test_time"
                  type="time"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                min="1"
                placeholder="60"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedCycle}>
              {loading ? "Creating..." : "Create Test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTestDialog;
