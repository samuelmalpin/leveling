import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_progress")
    .select("burnout_risk, variety_score, xp_total")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Progress profile not found" }, { status: 400 });
  }

  const isEligible = Number(profile.burnout_risk) >= 60 || Number(profile.variety_score) < 35;
  if (!isEligible) {
    return NextResponse.json(
      { error: "Recovery quest is available when burnout risk is high or variety score is low." },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: existingClaim, error: claimLookupError } = await supabase
    .from("product_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_name", "recovery_quest_claimed")
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lt("created_at", `${today}T23:59:59.999Z`)
    .maybeSingle();

  if (claimLookupError) {
    return NextResponse.json({ error: claimLookupError.message }, { status: 400 });
  }

  if (existingClaim) {
    return NextResponse.json({ error: "Recovery quest already claimed today." }, { status: 400 });
  }

  const xpReward = 80;
  const shieldReward = 1;

  const { data: nextLevel, error: levelError } = await supabase.rpc("fn_level_from_xp", {
    total_xp: profile.xp_total + xpReward
  });

  if (levelError) {
    return NextResponse.json({ error: levelError.message }, { status: 400 });
  }

  const { error: xpUpdateError } = await supabase
    .from("user_progress")
    .update({
      xp_total: profile.xp_total + xpReward,
      level: nextLevel,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", user.id);

  if (xpUpdateError) {
    return NextResponse.json({ error: xpUpdateError.message }, { status: 400 });
  }

  const { data: shieldRow, error: shieldReadError } = await supabase
    .from("streak_shields")
    .select("charges")
    .eq("user_id", user.id)
    .maybeSingle();

  if (shieldReadError) {
    return NextResponse.json({ error: shieldReadError.message }, { status: 400 });
  }

  if (!shieldRow) {
    const { error: shieldInsertError } = await supabase.from("streak_shields").insert({
      user_id: user.id,
      charges: shieldReward,
      updated_at: new Date().toISOString()
    });

    if (shieldInsertError) {
      return NextResponse.json({ error: `Shield grant failed: ${shieldInsertError.message}` }, { status: 400 });
    }
  } else {
    const { error: shieldUpdateError } = await supabase
      .from("streak_shields")
      .update({
        charges: shieldRow.charges + shieldReward,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (shieldUpdateError) {
      return NextResponse.json({ error: `Shield grant failed: ${shieldUpdateError.message}` }, { status: 400 });
    }
  }

  await supabase.from("xp_ledger").insert({
    user_id: user.id,
    source_type: "recovery_quest",
    source_id: user.id,
    xp_amount: xpReward
  });

  await supabase.from("product_events").insert({
    user_id: user.id,
    event_name: "recovery_quest_claimed",
    payload: {
      xpReward,
      shieldReward,
      burnoutRisk: profile.burnout_risk,
      varietyScore: profile.variety_score
    }
  });

  return NextResponse.json({ ok: true, xpReward, shieldReward });
}
