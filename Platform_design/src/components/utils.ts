import type { User } from "@supabase/supabase-js";

export function formatTime(date: Date | string): string {
  const resolved = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - resolved.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function getUserDisplayName(user: User | null): string {
  if (!user) return "Guest";

  const metadata = user.user_metadata ?? {};

  return (
    metadata.full_name ??
    metadata.name ??
    user.email?.split("@")[0] ??
    "Account"
  );
}
