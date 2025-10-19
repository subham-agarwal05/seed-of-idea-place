import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface Cycle {
  id: string;
  name: string;
  cycle_number: number;
  start_date: string;
  end_date: string;
}

interface CyclesListProps {
  campaignId: string;
}

const CyclesList = ({ campaignId }: CyclesListProps) => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCycles();
  }, [campaignId]);

  const fetchCycles = async () => {
    try {
      const { data, error } = await supabase
        .from("cycles")
        .select("*")
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
    } finally {
      setLoading(false);
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
    return <div className="text-center py-8">Loading cycles...</div>;
  }

  if (cycles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No cycles yet</h3>
          <p className="text-sm text-muted-foreground">
            Add your first cycle to organize tests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cycles.map((cycle) => (
        <Card key={cycle.id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">{cycle.name}</h3>
              <Badge>Cycle {cycle.cycle_number}</Badge>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Start: {formatDate(cycle.start_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>End: {formatDate(cycle.end_date)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CyclesList;
