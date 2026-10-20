import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

function sha256(input: string) { return crypto.createHash("sha256").update(input).digest("hex"); }

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { duo_id } = await req.json();
  if (!duo_id) return NextResponse.json({ error: "duo_id required" }, { status: 400 });

  // Must be member
  const { data: m } = await supabase.from("duo_members")
    .select("duo_id").eq("duo_id", duo_id).eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!m) return NextResponse.json({ error: "not a member of this duo" }, { status: 403 });

  const token = crypto.randomBytes(24).toString("hex");
  const token_hash = sha256(token);
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("duo_invitations").insert({
    duo_id, created_by: user.id, token_hash, expires_at
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ token, expires_at });
}
