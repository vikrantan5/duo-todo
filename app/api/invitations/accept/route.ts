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

export async function POST(req: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { token } = await req.json();

  if (!token) {
    return NextResponse.json(
      { error: "token required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("accept_invitation", {
    _token_hash: sha256(token),
  });

  if (!error && data) {
    return NextResponse.json({ duo_id: data });
  }

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
      return NextResponse.json(
        { error: "duo is full" },
        { status: 400 },
      );
    }

    const { error: memberError } = await admin
      .from("duo_members")
      .insert({
        duo_id: invitation.duo_id,
        user_id: user.id,
        role: "member",
        active: true,
      });

    if (memberError) {
      return NextResponse.json(
        { error: memberError.message },
        { status: 400 },
      );
    }

    const { error: updateError } = await admin
      .from("duo_invitations")
      .update({
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      await admin
        .from("duo_members")
        .delete()
        .eq("duo_id", invitation.duo_id)
        .eq("user_id", user.id);

      return NextResponse.json(
        { error: updateError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      duo_id: invitation.duo_id,
      used_fallback: true,
    });
  }

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ duo_id: data });
}