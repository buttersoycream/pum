import { streamText, gateway } from "ai";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/current-user";
import { getCoupleForUser } from "@/lib/couple/queries";
import { CHAT_MODEL, CHAT_PROVIDER_OPTIONS } from "@/lib/ai/client";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { classifyPersona } from "@/lib/ai/persona-router";
import { classifyArea } from "@/lib/ai/area-router";
import { mapPersonalContext } from "@/lib/ai/personal-context";
import { addMessage } from "@/lib/chat/mutations";
import { detectPhysicalEmergency } from "@/lib/ai/guards/emergency-keywords";
import { detectMentalHealthEmergency } from "@/lib/ai/guards/mental-health-emergency";

const admin = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

// visibility is intentionally excluded — must be read from DB, not client
type Body = {
  chatId: string;
  message: string;
  meta?: { cycleCount?: number; yearsTrying?: number; maleFactor?: boolean };
};

export async function POST(request: Request) {
  const user = await requireUser();
  const { chatId, message, meta = {} } = (await request.json()) as Body;

  // Fix 3: reject empty input before any DB/AI work
  if (!chatId || !message?.trim()) {
    return Response.json({ error: "chatId and message are required" }, { status: 400 });
  }

  const db = admin();

  // Fix 2: resolve coupleId + load chat from DB; 404 if not owned by this couple
  const coupleId = await getCoupleForUser(user.id);
  const { data: chat } = await db
    .from("ai_chats")
    .select("couple_id, visibility")
    .eq("id", chatId)
    .maybeSingle();

  if (!chat || !coupleId || chat.couple_id !== coupleId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Fix 4: visibility comes from DB, not client
  const visibility = chat.visibility as "pair" | "private";

  // Guard check — both detectors return { triggered: boolean; matched: string[] }
  const physicalResult = detectPhysicalEmergency(message);
  const mentalResult = detectMentalHealthEmergency(message);

  if (physicalResult.triggered || mentalResult.triggered) {
    const kind = physicalResult.triggered ? "physical_emergency" : "mental_health_emergency";
    await addMessage(db, { chatId, role: "user", content: message });
    await addMessage(db, { chatId, role: "assistant", content: "", guardTriggered: [kind] });
    return Response.json({ escalation: kind });
  }

  const persona = classifyPersona(message, meta);
  const area = classifyArea(message);

  // Fix 5: degrade gracefully if personal context lookup fails
  const personalContext = await mapPersonalContext(db, coupleId).catch((e) => {
    console.error("[chat] mapPersonalContext failed", e);
    return {} as Awaited<ReturnType<typeof mapPersonalContext>>;
  });

  const system = buildSystemPrompt({ persona, visibility, personalContext });

  const { data: history } = await db
    .from("ai_messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  const messages = [
    ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  await addMessage(db, { chatId, role: "user", content: message });

  const result = streamText({
    model: gateway(CHAT_MODEL),
    system,
    messages,
    providerOptions: CHAT_PROVIDER_OPTIONS,
    // Fix 1: wrap entire body so silent failures are logged and not lost
    onFinish: async ({ text }) => {
      try {
        await addMessage(db, { chatId, role: "assistant", content: text });
        const { error: updErr } = await db
          .from("ai_chats")
          .update({ area, persona, updated_at: new Date().toISOString() })
          .eq("id", chatId);
        if (updErr) console.error("[chat] ai_chats update failed", chatId, updErr);
      } catch (e) {
        console.error("[chat:onFinish] persist failed", chatId, e);
      }
    },
  });

  return result.toTextStreamResponse();
}
