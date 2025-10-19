import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const SeatingArrangement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchVenues();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchVenues = async () => {
    const { data } = await supabase.from("venues").select("*").eq("test_id", id);
    setVenues(data || []);
  };

  const handleAddVenue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("venue_name") as string;
    const capacity = parseInt(formData.get("capacity") as string);

    const { error } = await supabase.from("venues").insert({
      test_id: id,
      name,
      capacity,
    });

    if (!error) {
      toast({ title: "Venue added" });
      fetchVenues();
      (e.target as HTMLFormElement).reset();
    }
  };

  const generateSeating = async () => {
    setLoading(true);
    try {
      const { data: applicants } = await supabase
        .from("applicants")
        .select("id, roll_number, name")
        .eq("test_id", id);

      if (!applicants || applicants.length === 0) {
        toast({ title: "No applicants found", variant: "destructive" });
        return;
      }

      const shuffled = [...applicants].sort(() => Math.random() - 0.5);
      let currentVenue = 0;
      let seatInVenue = 1;

      const updates = shuffled.map((applicant) => {
        if (currentVenue >= venues.length) {
          return { ...applicant, venue_id: null, seat_number: null };
        }

        const venue = venues[currentVenue];
        const result = {
          id: applicant.id,
          venue_id: venue.id,
          seat_number: `${seatInVenue}`,
        };

        seatInVenue++;
        if (seatInVenue > venue.capacity) {
          currentVenue++;
          seatInVenue = 1;
        }

        return result;
      });

      for (const update of updates) {
        await supabase.from("applicants").update({
          venue_id: update.venue_id,
          seat_number: update.seat_number,
        }).eq("id", update.id);
      }

      toast({ title: "Seating arrangement generated!" });
      exportSeatingArrangement();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportSeatingArrangement = async () => {
    const { data } = await supabase
      .from("applicants")
      .select(`*, venues(name)`)
      .eq("test_id", id)
      .not("venue_id", "is", null);

    const exportData = (data || []).map((a: any) => ({
      "Roll Number": a.roll_number,
      "Name": a.name,
      "Venue": a.venues?.name || "N/A",
      "Seat": a.seat_number || "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seating");
    XLSX.writeFile(wb, "Seating_Arrangement.xlsx");
  };

  return (
    <DashboardLayout activeTab="campaigns">
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h2 className="text-3xl font-bold">Seating Arrangement</h2>

        <Card>
          <CardHeader>
            <CardTitle>Add Venue</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddVenue} className="flex gap-3">
              <div className="flex-1">
                <Input name="venue_name" placeholder="Venue name" required />
              </div>
              <div className="w-32">
                <Input name="capacity" type="number" placeholder="Capacity" required />
              </div>
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {venues.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <span className="font-medium">{v.name}</span>
                <span className="text-muted-foreground">Capacity: {v.capacity}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button onClick={generateSeating} disabled={loading || venues.length === 0} className="w-full">
          <Shuffle className="h-4 w-4 mr-2" />
          {loading ? "Generating..." : "Generate Random Seating"}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default SeatingArrangement;
