import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CreateCycleDialog from "@/components/campaigns/CreateCycleDialog";
import CreateTestDialog from "@/components/campaigns/CreateTestDialog";
import CyclesList from "@/components/campaigns/CyclesList";
import TestsList from "@/components/campaigns/TestsList";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
}

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error: any) {
      toast({
        title: "Error loading campaign",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeTab="campaigns">
        <div className="text-center py-8">Loading campaign...</div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout activeTab="campaigns">
        <div className="text-center py-8">Campaign not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="campaigns">
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate("/campaigns")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">{campaign.name}</h2>
          <p className="text-muted-foreground">
            {campaign.description || "No description provided"}
          </p>
        </div>

        <Tabs defaultValue="cycles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cycles">Cycles</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
          </TabsList>

          <TabsContent value="cycles" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCycleDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Cycle
              </Button>
            </div>
            <CyclesList campaignId={id!} />
          </TabsContent>

          <TabsContent value="tests" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setTestDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </div>
            <TestsList campaignId={id!} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateCycleDialog
        open={cycleDialogOpen}
        onOpenChange={setCycleDialogOpen}
        campaignId={id!}
      />
      <CreateTestDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        campaignId={id!}
      />
    </DashboardLayout>
  );
};

export default CampaignDetail;
