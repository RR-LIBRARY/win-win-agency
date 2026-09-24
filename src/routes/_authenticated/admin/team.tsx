import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { formatDate } from "@/components/site/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { grantAdminByEmail, listTeam, revokeAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: AdminTeamPage,
});

function AdminTeamPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const team = useQuery({ queryKey: ["admin-team"], queryFn: () => listTeam() });
  const [email, setEmail] = useState("");

  const grant = useMutation({
    mutationFn: () => grantAdminByEmail({ data: { email } }),
    onSuccess: async () => {
      toast.success("Admin access granted");
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (error) => toast.error("Could not grant access", { description: error.message }),
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => revokeAdmin({ data: { userId } }),
    onSuccess: async () => {
      toast.success("Admin access removed");
      await queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (error) => toast.error("Could not remove access", { description: error.message }),
  });

  if (team.isLoading) return <PanelLoading rows={3} />;
  if (team.error) return <PanelError error={team.error} />;
  const members = team.data ?? [];
  const admins = members.filter((m) => m.isAdmin);
  const customers = members.filter((m) => !m.isAdmin);

  return (
    <div className="space-y-6">
      <PanelCard title="Add an admin" description="They must already have an account on the site (ask them to sign up first).">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            grant.mutate();
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="teammate@example.com" />
          </div>
          <button type="submit" disabled={grant.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {grant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Grant admin
          </button>
        </form>
      </PanelCard>

      <PanelCard title={`Admins (${admins.length})`}>
        <ul className="divide-y divide-border">
          {admins.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  {member.full_name || member.email}
                  {member.id === user.id ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.email} · joined {formatDate(member.created_at)}
                </p>
              </div>
              {member.id !== user.id ? (
                <button type="button" onClick={() => revoke.mutate(member.id)} disabled={revoke.isPending} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60">
                  <ShieldOff className="h-3.5 w-3.5" /> Remove admin
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </PanelCard>

      <PanelCard title={`Customers (${customers.length})`} description="Everyone who has created an account.">
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customer accounts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {customers.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{member.full_name || member.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.email}
                    {member.phone ? ` · ${member.phone}` : ""} · joined {formatDate(member.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
