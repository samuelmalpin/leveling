import Link from "next/link";
import { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/workouts/new", label: "Log Workout" },
  { href: "/quests", label: "Quests" },
  { href: "/bosses", label: "Bosses" },
  { href: "/social", label: "Social" },
  { href: "/squads", label: "Squads" },
  { href: "/squads/leaderboard", label: "Squad Ladder" },
  { href: "/profile", label: "Profile" }
];

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card/70 p-4 backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mutedForeground">Fitness RPG</p>
          <h1 className="text-xl font-bold tracking-wide">{APP_NAME}</h1>
        </div>

        <nav className="flex flex-wrap gap-2">
          {user
            ? navItems.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm text-mutedForeground hover:bg-muted hover:text-foreground">
                  {item.label}
                </Link>
              ))
            : null}
        </nav>

        <div>
          {user ? (
            <form action="/auth/signout" method="post">
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          ) : (
            <Link href="/login" className="text-sm text-mutedForeground hover:text-foreground">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
