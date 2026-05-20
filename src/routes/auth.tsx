import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { KERALA_DISTRICTS } from "@/lib/districts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: AuthPage,
  head: () => ({
    meta: [{ title: "Login / Sign up — Kurangu" }],
  }),
});

const nicknameSchema = z
  .string()
  .trim()
  .min(2, "ചുരുങ്ങിയത് 2 അക്ഷരം")
  .max(24, "പരമാവധി 24 അക്ഷരം")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscore");

function syntheticEmail(nickname: string) {
  return `${nickname.toLowerCase()}@kurangu.local`;
}

function AuthPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🐒🍌</div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Kurangu</h1>
          <p className="text-xs text-muted-foreground mt-1">
            മലയാളം AI ട്രോൾ ബോട്ട്
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          <TabsContent value="signup">
            <SignupForm />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

const loginSchema = z.object({
  nickname: nicknameSchema,
  password: z.string().min(6, "ചുരുങ്ങിയത് 6 അക്ഷരം"),
});

function LoginForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    try {
      // Resolve nickname → email
      const { data: email, error: rpcError } = await supabase.rpc(
        "get_email_by_nickname",
        { _nickname: values.nickname },
      );
      if (rpcError || !email) {
        toast.error("Nickname കണ്ടെത്തിയില്ല");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });
      if (error) {
        toast.error("തെറ്റായ password");
        return;
      }
      toast.success("സ്വാഗതം!");
      navigate({ to: "/" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-nick">Nickname</Label>
        <Input id="login-nick" autoComplete="username" {...register("nickname")} />
        {errors.nickname && <p className="text-xs text-destructive">{errors.nickname.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-pass">Password</Label>
        <Input
          id="login-pass"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={loading} className="w-full font-black uppercase">
        {loading ? <Loader2 className="animate-spin" /> : "Login 🍌"}
      </Button>
    </form>
  );
}

const signupSchema = z
  .object({
    nickname: nicknameSchema,
    fullName: z.string().trim().min(2, "Required").max(80),
    place: z.string().trim().min(2, "Required").max(80),
    district: z.enum(KERALA_DISTRICTS),
    password: z.string().min(6, "ചുരുങ്ങിയത് 6 അക്ഷരം").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords match ആകുന്നില്ല",
    path: ["confirm"],
  });

function SignupForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
  });

  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("ഫോട്ടോ 2MB-യിൽ കുറവായിരിക്കണം");
      return;
    }
    setAvatar(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    try {
      // Check nickname uniqueness via RPC
      const { data: existing } = await supabase.rpc("get_email_by_nickname", {
        _nickname: values.nickname,
      });
      if (existing) {
        toast.error("ഈ nickname എടുത്തിട്ടുണ്ട്");
        return;
      }

      const email = syntheticEmail(values.nickname);
      const { data: signup, error: signErr } = await supabase.auth.signUp({
        email,
        password: values.password,
      });
      if (signErr || !signup.user) {
        toast.error(signErr?.message || "Signup പരാജയം");
        return;
      }

      // Sign in immediately (auto-confirm is on)
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });
      if (loginErr) {
        toast.error("Auto-login പരാജയം. Login tab use ചെയ്യൂ.");
        return;
      }

      // Upload avatar (optional)
      let avatarUrl: string | null = null;
      if (avatar) {
        const path = `${signup.user.id}/avatar.${avatar.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatar, { upsert: true, contentType: avatar.type });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
          avatarUrl = pub.publicUrl;
        }
      }

      // Insert profile
      const { error: profErr } = await supabase.from("profiles").insert({
        id: signup.user.id,
        nickname: values.nickname,
        full_name: values.fullName,
        place: values.place,
        district: values.district,
        avatar_url: avatarUrl,
      });
      if (profErr) {
        toast.error("Profile create പരാജയം: " + profErr.message);
        return;
      }
      toast.success("സ്വാഗതം, " + values.nickname + "! 🐒");
      navigate({ to: "/" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-4">
      <div className="rounded-lg border-2 border-primary/60 bg-primary/10 p-3 text-sm text-center font-bold">
        നിക്‌നെയിമും പാസ്‌വേഡും ഒരിക്കലും മറക്കരുത്.
      </div>

      <div className="flex items-center gap-3">
        <label className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer overflow-hidden shrink-0">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
        </label>
        <div className="text-xs text-muted-foreground">
          Profile photo (optional)
          <br />
          Max 2MB
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-nick">Nickname *</Label>
        <Input id="su-nick" autoComplete="username" {...register("nickname")} />
        {errors.nickname && <p className="text-xs text-destructive">{errors.nickname.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-full">Full Name *</Label>
        <Input id="su-full" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-place">Place *</Label>
        <Input id="su-place" placeholder="e.g. Kazhakkoottam" {...register("place")} />
        {errors.place && <p className="text-xs text-destructive">{errors.place.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>District *</Label>
        <Select onValueChange={(v) => setValue("district", v as (typeof KERALA_DISTRICTS)[number])}>
          <SelectTrigger>
            <SelectValue placeholder="ജില്ല തിരഞ്ഞെടുക്കൂ" />
          </SelectTrigger>
          <SelectContent>
            {KERALA_DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.district && <p className="text-xs text-destructive">{errors.district.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-pass">Password *</Label>
        <Input id="su-pass" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-conf">Confirm Password *</Label>
        <Input id="su-conf" type="password" autoComplete="new-password" {...register("confirm")} />
        {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
      </div>

      <Button type="submit" disabled={loading} className="w-full font-black uppercase">
        {loading ? <Loader2 className="animate-spin" /> : "Sign up 🐒"}
      </Button>
    </form>
  );
}
