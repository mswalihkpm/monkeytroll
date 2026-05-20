import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: Leaderboard,
  head: () => ({
    meta: [{ title: "Kurangu — Leaderboard" }],
  }),
});

type Row = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  district: string;
  bonus_points: number;
};

function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, district, bonus_points")
        .order("bonus_points", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Row[];
    },
    refetchInterval: 10_000,
  });

  const top3 = data?.slice(0, 3) ?? [];
  const rest = data?.slice(3) ?? [];

  return (
    <main className="mx-auto w-full max-w-md px-3 pt-4 pb-4">
      <h1 className="text-xl font-black uppercase tracking-tight text-center mb-1">
        🏆 Leaderboard
      </h1>
      <p className="text-xs text-muted-foreground text-center mb-5">
        ഏറ്റവും കൂടുതൽ trolling points നേടിയവർ
      </p>

      {isLoading && (
        <div className="text-center text-sm text-muted-foreground py-10">
          Loading...
        </div>
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2 items-end mb-6">
          {/* 2nd */}
          <PodiumCard row={top3[1]} place={2} heightClass="h-24" />
          {/* 1st */}
          <PodiumCard row={top3[0]} place={1} heightClass="h-32" />
          {/* 3rd */}
          <PodiumCard row={top3[2]} place={3} heightClass="h-20" />
        </div>
      )}

      <ul className="space-y-2">
        {rest.map((r, i) => (
          <li
            key={r.id}
            className="flex items-center gap-3 bg-card border-2 border-border rounded-xl p-2.5"
          >
            <div className="w-7 text-center font-black text-muted-foreground">
              {i + 4}
            </div>
            <Avatar url={r.avatar_url} name={r.nickname} size={36} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{r.nickname}</div>
              <div className="text-[10px] text-muted-foreground">{r.district}</div>
            </div>
            <div className="text-sm font-black text-primary">{r.bonus_points}</div>
          </li>
        ))}
      </ul>

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="text-center text-sm text-muted-foreground py-10">
          ഇതുവരെ ആരും ഇല്ല. ആദ്യത്തെ winner നീ ആകൂ!
        </div>
      )}
    </main>
  );
}

function PodiumCard({
  row,
  place,
  heightClass,
}: {
  row: Row | undefined;
  place: number;
  heightClass: string;
}) {
  if (!row) {
    return <div className={`bg-muted rounded-t-xl ${heightClass}`} />;
  }
  const Icon = place === 1 ? Trophy : place === 2 ? Medal : Award;
  const color =
    place === 1
      ? "border-primary bg-primary/15"
      : place === 2
        ? "border-secondary bg-secondary/15"
        : "border-accent bg-accent/15";
  return (
    <div className="flex flex-col items-center">
      <Avatar url={row.avatar_url} name={row.nickname} size={place === 1 ? 64 : 52} />
      <div className="text-xs font-bold mt-1 truncate max-w-full">{row.nickname}</div>
      <div className="text-[10px] text-muted-foreground">{row.district}</div>
      <div
        className={`mt-1 w-full ${heightClass} ${color} border-2 rounded-t-xl flex flex-col items-center justify-start pt-2`}
      >
        <Icon className="w-5 h-5" />
        <div className="text-lg font-black">{row.bonus_points}</div>
        <div className="text-[10px] uppercase font-bold">#{place}</div>
      </div>
    </div>
  );
}

function Avatar({
  url,
  name,
  size,
}: {
  url: string | null;
  name: string;
  size: number;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border-2 border-primary/60 shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-primary/20 border-2 border-primary/60 flex items-center justify-center font-black text-primary shrink-0"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
