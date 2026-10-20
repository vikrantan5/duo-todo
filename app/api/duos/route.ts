import { NextResponse } from "next/server";
import crypto from "crypto";
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

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    display_name?: unknown;
  } | null;

  const displayName =
    typeof body?.display_name === "string"
      ? body.display_name.trim()
      : "";

  if (!displayName) {
    return NextResponse.json(
      { error: "display_name required" },
      { status: 400 },
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 400 },
    );
  }

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: duoId, error: duoError } = await supabase.rpc(
    "create_duo_with_invitation",
    {
      _name: `${displayName}'s Duo`,
      _token_hash: tokenHash,
      _expires_at: expiresAt,
    },
  );

  if (!duoError && duoId) {
    return NextResponse.json({
      duo_id: duoId,
      token,
      expires_at: expiresAt,
    });
  }

  if (isMissingRpc(duoError)) {
    const admin = createAdmin();

    const { data: existing } = await admin
      .from("duo_members")
      .select("duo_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "you already belong to a duo" },
        { status: 400 },
      );
    }

    const { data: duo, error: createError } = await admin
      .from("duos")
      .insert({
        name: `${displayName}'s Duo`,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (createError || !duo) {
      return NextResponse.json(
        { error: createError?.message || "Could not create duo" },
        { status: 400 },
      );
    }

    const { error: memberError } = await admin
      .from("duo_members")
      .insert({
        duo_id: duo.id,
        user_id: user.id,
        role: "owner",
        active: true,
      });

    const { error: invitationError } = memberError
      ? { error: memberError }
      : await admin.from("duo_invitations").insert({
          duo_id: duo.id,
          created_by: user.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
        });

    if (memberError || invitationError) {
      await admin.from("duos").delete().eq("id", duo.id);

      return NextResponse.json(
        {
          error:
            memberError?.message ||
            invitationError?.message ||
            "Could not create invitation",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      duo_id: duo.id,
      token,
      expires_at: expiresAt,
      used_fallback: true,
    });
  }

  return NextResponse.json(
    { error: duoError?.message || "Could not create duo" },
    { status: 400 },
  );
}