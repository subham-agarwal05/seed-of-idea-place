import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface UsersListProps {
  isAdmin: boolean;
}

const UsersList = ({ isAdmin }: UsersListProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          user_roles (role)
        `);

      if (error) throw error;

      const formattedUsers = (data || []).map((user: any) => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.user_roles?.[0]?.role || "volunteer",
      }));

      setUsers(formattedUsers);
    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            You don't have permission to view user management
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No users yet</h3>
          <p className="text-sm text-muted-foreground">
            Add your first volunteer or admin user
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{user.full_name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UsersList;
