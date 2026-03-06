import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServer } from "@/lib/supabase/server";

const schema = z.object({
  cardType: z.enum(["power_scan", "muscle_rank", "achievement"])
});

export async function POST(request: Request) {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_generate_share_card", {
    p_user_id: user.id,
    p_card_type: parsed.data.cardType
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("product_events").insert({
    user_id: user.id,
    event_name: "share_card_generated",
    payload: {
      cardType: parsed.data.cardType
    }
  });

  const generatedId = (data as { id?: string } | null)?.id;
  if (!generatedId) {
    return NextResponse.json({ ok: true, data });
  }

  const { data: persistedCard, error: persistedCardError } = await supabase
    .from("share_cards")
    .select("id, card_type, title, payload, created_at")
    .eq("id", generatedId)
    .single();

  if (persistedCardError) {
    return NextResponse.json({ ok: true, data });
  }

  return NextResponse.json({ ok: true, data: persistedCard });
}
