import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Kurangu — Profile" }] }),
});

type Profile = {
  id: string;
  nickname: string;
  full_name: string;
  place: string;
  district: string;
  avatar_url: string | null;
  bonus_points: number;
};

function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .single();
      if (data) setProfile(data as Profile);
    })();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate({ to: "/auth" });
  };

  if (!profile) {
    return (
      <main className="mx-auto max-w-md px-3 pt-6 text-center text-sm text-muted-foreground">
        Loading...
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-3 pt-6 pb-4">
      <div className="flex flex-col items-center text-center">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.nickname}
            className="w-24 h-24 rounded-full object-cover border-4 border-primary"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary/20 border-4 border-primary flex items-center justify-center text-3xl font-black text-primary">
            {profile.nickname.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-black mt-3">{profile.nickname}</h1>
        <p className="text-sm text-muted-foreground">{profile.full_name}</p>
      </div>

      <div className="mt-6 space-y-2">
        <Row label="Place" value={profile.place} />
        <Row label="District" value={profile.district} />
        <Row
          label="Bonus Points"
          value={
            <span className="font-black text-primary text-lg">
              {profile.bonus_points} 🍌
            </span>
          }
        />
      </div>

      <Button onClick={logout} variant="destructive" className="w-full mt-8 font-black uppercase">
        <LogOut className="w-4 h-4" /> Logout
      </Button>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between bg-card border-2 border-border rounded-xl px-4 py-3">
      <span className="text-xs font-bold uppercase text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
