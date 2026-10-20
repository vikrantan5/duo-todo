import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import type { User } from "@supabase/supabase-js";
import { createAdmin, createClient } from "@/lib/supabase/server";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function isMissingRpc(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST202" ||
    /schema cache|could not find the function/i.test(error?.message ?? "")
  );
}

async function confirmMembership(
  supabase: ReturnType<typeof createClient>,
  user: User,
  duoId: string,
) {
  // 1. Verify membership row exists
  const { data: member, error } = await supabase
    .from("duo_members")
    .select("duo_id,user_id,role,joined_at,active")
    .eq("duo_id", duoId)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error || !member) {
    return { error: error?.message || "membership was not created" };
  }

  // 2. Ensure profile exists (auth trigger may not have run)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
      typeof metadata.display_name === "string"
        ? metadata.display_name.trim()
        : "";
    const timezone =
      typeof metadata.timezone === "string" && metadata.timezone.trim()
        ? metadata.timezone.trim()
        : "UTC";

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      timezone,
    });

    if (profileError && profileError.code !== "23505") {
      return { error: profileError.message };
    }
  }

  return { member };
}

function revalidateAll() {
  revalidatePath("/", "layout");
  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/insights");
}

export async function POST(req: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let token: string | undefined;
  try {
    ({ token } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  // ---- Primary path: SECURITY DEFINER RPC ----
  const { data, error } = await supabase.rpc("accept_invitation", {
    _token_hash: sha256(token),
  });

  if (!error && data) {
    const membership = await confirmMembership(supabase, user, data);
    if (membership.error) {
      return NextResponse.json({ error: membership.error }, { status: 500 });
    }
    revalidateAll();
    return NextResponse.json({ duo_id: data, member: membership.member });
  }

  // ---- Fallback: RPC missing -> do it with admin client ----
  if (isMissingRpc(error)) {
    const admin = createAdmin();
    const tokenHash = sha256(token);

    const { data: invitation } = await admin
      .from("duo_invitations")
      .select("id,duo_id,created_by,expires_at")
      .eq("token_hash", tokenHash)
      .is("accepted_by", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json(
        { error: "invitation invalid or expired" },
        { status: 400 },
      );
    }

    if (invitation.created_by === user.id) {
      return NextResponse.json(
        { error: "cannot accept your own invite" },
        { status: 400 },
      );
    }

    const { data: currentMembership } = await admin
      .from("duo_members")
      .select("duo_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (currentMembership) {
      return NextResponse.json(
        { error: "you already belong to a duo" },
        { status: 400 },
      );
    }

    const { count } = await admin
      .from("duo_members")
      .select("user_id", { count: "exact", head: true })
      .eq("duo_id", invitation.duo_id)
      .eq("active", true);

    if ((count ?? 0) >= 2) {
      return NextResponse.json({ error: "duo is full" }, { status: 400 });
    }

    const { error: memberError } = await admin.from("duo_members").insert({
      duo_id: invitation.duo_id,
      user_id: user.id,
      role: "member",
      active: true,
    });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("duo_invitations")
      .update({
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      // rollback membership insert
      await admin
        .from("duo_members")
        .delete()
        .eq("duo_id", invitation.duo_id)
        .eq("user_id", user.id);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const membership = await confirmMembership(
      supabase,
      user,
      invitation.duo_id,
    );
    if (membership.error) {
      return NextResponse.json({ error: membership.error }, { status: 500 });
    }

    revalidateAll();

    return NextResponse.json({
      duo_id: invitation.duo_id,
      member: membership.member,
      used_fallback: true,
    });
  }

  // ---- Real RPC error ----
  return NextResponse.json(
    { error: error?.message ?? "failed to accept invitation" },
    { status: 400 },
  );
}