import { AgentScreen } from "@/components/agent/agent-screen";
export const metadata = { title: "Percakapan Agent | Manrisk" };
export default async function AgentConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <AgentScreen conversationId={conversationId} />;
}
