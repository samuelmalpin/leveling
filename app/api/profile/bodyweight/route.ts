import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServer } from "@/lib/supabase/server";

const payloadSchema = z.object({
  bodyweightKg: z.number().min(35).max(300)
});

export async function POST(request: Request) {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid bodyweight payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({ bodyweight_kg: parsed.data.bodyweightKg, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, bodyweightKg: parsed.data.bodyweightKg });
}
