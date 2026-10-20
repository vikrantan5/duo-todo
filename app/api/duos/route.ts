import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { display_name?: unknown } | null;
  const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";

  if (!displayName) {
    return NextResponse.json({ error: "display_name required" }, { status: 400 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: duoId, error: duoError } = await supabase.rpc("create_duo_with_invitation", {
    _name: `${displayName}'s Duo`,
    _token_hash: tokenHash,
    _expires_at: expiresAt,
  });

  if (duoError || !duoId) {
    return NextResponse.json(
      { error: duoError?.message || "Could not create duo" },
      { status: 400 },
    );
  }

  return NextResponse.json({ duo_id: duoId, token, expires_at: expiresAt });
}