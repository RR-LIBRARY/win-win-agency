import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyProfile, updateMyProfile } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.full_name);
      setPhone(profile.data.phone);
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      await updateMyProfile({ data: { full_name: fullName, phone } });
      await supabase.auth.updateUser({ data: { full_name: fullName, phone } });
    },
    onSuccess: () => {
      toast.success("Profile saved");
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (error) => toast.error("Could not save", { description: error.message }),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated");
      setPassword("");
    },
    onError: (error) => toast.error("Could not update password", { description: error.message }),
  });

  if (profile.isLoading) return <PanelLoading rows={2} />;
  if (profile.error) return <PanelError error={profile.error} />;

  return (
    <div className="space-y-6">
      <PanelCard title="Your details" description="Used to pre-fill checkout and booking forms.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp number</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Email</Label>
            <Input value={profile.data?.email ?? ""} disabled />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
            </button>
          </div>
        </form>
      </PanelCard>

      <PanelCard title="Change password">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <Input id="new_password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
          >
            {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update password
          </button>
        </form>
      </PanelCard>
    </div>
  );
}
