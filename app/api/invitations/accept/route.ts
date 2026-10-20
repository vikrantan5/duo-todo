import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

function sha256(input: string) { return crypto.createHash("sha256").update(input).digest("hex"); }

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const { data, error } = await supabase.rpc("accept_invitation", { _token_hash: sha256(token) });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ duo_id: data });
}
