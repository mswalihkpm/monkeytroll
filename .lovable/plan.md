# Kurangu — Auth, Profiles, Leaderboard, Smarter Monkey

Mobile-first Malayalam troll-bot upgrade. Adds custom (non-OAuth) auth, rich profiles with district-aware slang, a public leaderboard, and a sharper Kurangu persona (joker + educated debater) packed with Malayalam cinema dialogues.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud and create:

**`profiles` table**
- `id` uuid PK → `auth.users(id)` on delete cascade
- `nickname` text unique (used as login handle)
- `full_name` text
- `place` text
- `district` text (one of 14 Kerala districts)
- `avatar_url` text nullable
- `bonus_points` int default 0
- `created_at` timestamptz default now()
- RLS: anyone authenticated can `select` (for leaderboard); user can `update` only own row; insert via trigger on signup.

**Storage bucket** `avatars` (public) with RLS so users can upload to their own folder.

**`nickname_lookup` RPC** (security definer) — `get_email_by_nickname(nickname text) returns text` so login by nickname works (signs in with email under the hood).

**`award_bonus(delta int)`** RPC — increments `bonus_points` of `auth.uid()`.

## 2. Auth Flow (custom, no OAuth)

- `/auth` route (mobile-first): tabs Login | Sign up.
- **Sign up fields**: optional avatar upload, nickname, full name, place, district (dropdown of 14), password + confirm.
- Synthetic email = `<nickname>@kurangu.local` so Supabase auth works without real email; user only ever sees nickname.
- Notice on signup form: **"നിക്‌നെയിമും പാസ്‌വേഡും ഒരിക്കലും മറക്കരുത്."**
- **Login fields**: nickname + password. Resolves nickname → email via RPC then `signInWithPassword`.
- `_authenticated` layout guards chat + leaderboard routes.

## 3. Routes & Mobile UX

- `/auth` — login/signup
- `/` (auth-guarded) — chat (existing UI, restyled mobile-first)
- `/leaderboard` — top users, first 3 highlighted with podium (avatar, nickname, bonus_points), then ranked list
- Bottom tab bar (Chat | Leaderboard | Profile/Logout) for thumb reach
- All cards/forms use `max-w-md` centered, large tap targets, sticky composer above keyboard

## 4. Kurangu AI upgrade

System prompt rewrite — Kurangu is now:
- Standard joker AND educated debater (history, science, philosophy, current affairs)
- Will challenge user with thoughtful counter-questions, not only jokes
- Heavy Malayalam cinema dialogue use, contextual to chat (Mohanlal / Mammootty / Fahadh / Suresh Gopi / Salim Kumar lines)
- Slang adapts to user's district (Thiruvananthapuram "എന്താടേയ്", Thrissur "എടാ മാളോരേ", Kozhikode "ഇജ്ജ്/ഞമ്മള്", Kannur, Malappuram, etc.) — district passed in system prompt
- Opening line on first message of a session uses the user's nickname as a comedy intro dialogue
- **Remove** the boring "നിനക്ക് വല്ല പഴവും വേണോ?" closer. Replace with rotating witty closers (10+ variants) e.g. "ഇനി പറയടാ മോനെ, അടുത്ത മണ്ടത്തരം എന്താ?", "എന്നാ, ഒരു പുളിയിലയ്ക്ക് കൂടി പറയട്ടേ?", "നീ ഇത് കേട്ടിട്ട് ചിരിച്ചോ, അതോ ഞാൻ ചിരിക്കണോ?" — picked per-reply by the model, never the banana question.

## 5. Bonus points logic

After each assistant reply, client calls `award_bonus` with delta based on user message length & quality heuristic (e.g. >20 chars = +2, >60 = +5, contains "?" debate = +3). Simple, no separate scorer model.

Profile context (nickname, district) fetched once on mount and passed to `/api/chat` in request body → injected into system prompt server-side.

## Technical notes

- `src/integrations/supabase/client.ts` (browser) + `auth-middleware.ts` already scaffold-ready after enabling Cloud.
- `/api/chat` accepts `{ messages, profile: { nickname, district } }`.
- District list: Thiruvananthapuram, Kollam, Pathanamthitta, Alappuzha, Kottayam, Idukki, Ernakulam, Thrissur, Palakkad, Malappuram, Kozhikode, Wayanad, Kannur, Kasaragod.
- Avatar upload via Supabase storage; preview before submit.
- React Hook Form + Zod for both forms.

Ready to implement on approval.