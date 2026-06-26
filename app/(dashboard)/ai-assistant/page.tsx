// app/(dashboard)/ai-assistant/page.tsx
import { Metadata } from "next";
import { AIChatClient } from "@/components/ai/ai-chat-client";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AIAssistantPage() {
  return <AIChatClient />;
}