"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  duoId: string;
  userId: string;
};

/**
 * Keeps server-rendered duo membership and profile data fresh while a user is
 * already inside the app. Task updates have their own local subscription in
 * TodayBoard; this channel handles the membership boundary created by invite
 * acceptance and profile/name changes.
 */
export default function DuoSync({ duoId, userId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 120);
    };

    const channel = supabase
      .channel(`duo-sync:${duoId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "duo_members",
          filter: `duo_id=eq.${duoId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        refresh,
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [duoId, router, supabase, userId]);

  return null;
}