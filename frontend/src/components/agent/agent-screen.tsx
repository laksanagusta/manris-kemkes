"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { consumeAgentComposerFocus, requestAgentComposerFocus } from "@/lib/agent-composer-focus";
import { agentApi } from "@/lib/agent-api";
import { agentAttachmentError, agentAttachmentWarning, agentConversationTimeline, agentDate, agentRelativeTime, agentRefreshRequest, agentRunLabels, isAgentRunning } from "@/lib/agent-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertCircle, ChevronDown, FileText, Lock, Plus } from "@/components/shared/icons";
import { AgentComposer, type AgentDraftFile } from "./agent-composer";
import { AgentActivity } from "./agent-activity";
import { AgentStart, AgentSuggestions } from "./agent-start";
import { AgentConversationHeader, AgentConversationLayout } from "./agent-conversation-layout";
import { AgentWidget } from "./agent-widget";
import { AgentProposal } from "./agent-proposal";
import { agentError, useAgentData } from "./use-agent-data";
import { useAgentScroll } from "./use-agent-scroll";
import { AgentMessageDownloads } from "./agent-message-downloads";
import type { AgentMessage, AgentOperation, AgentProposal as Proposal, AgentRunStatus, AgentSkillId, AgentWidget as Widget } from "@/types/agent";
import "./agent.css";

export function AgentScreen({ conversationId }: { conversationId?: string }) {
  const { token, hasFullSession } = useAuth();
  if (!token || !hasFullSession) return <div className="agent-panel agent-session-state"><Lock className="size-5" aria-hidden="true" /><p>Memuat sesi percakapan…</p></div>;
  return <AgentSession key={`${token}:${conversationId ?? "new"}`} conversationId={conversationId} token={token} />;
}
function AgentHistoryStatus({ status }: { status: string }) {
  const label = agentRunLabels[status as AgentRunStatus];
  return label && status !== "completed" ? <Badge variant="secondary" className="shrink-0 text-xs">{label}</Badge> : null;
}
function AgentSession({ conversationId, token }: { conversationId?: string; token: string }) {
  const router = useRouter();
  const disabled = isAIFeaturesDisabled();
  const { history, skills, detail, setDetail, loading, error, historyError, historyLoading, skillsError, reload, clearPrivateData, mounted } = useAgentData(conversationId, token, disabled);
  const [content, setContent] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<AgentSkillId[]>([]);
  const [files, setFiles] = useState<AgentDraftFile[]>([]);
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [busyProposal, setBusyProposal] = useState<string>();
  const [actionError, setActionError] = useState("");
  const sendLock = useRef(false);
  const mutationLock = useRef(false);
  const createdId = useRef(conversationId);
  const restoreFocus = useRef(false);
  const sendAttempt = useRef<{ signature: string; key: string } | null>(null);
  const refreshAttempt = useRef<{ signature: string; key: string } | null>(null);
  const applyKeys = useRef(new Map<string, string>());
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const { scrollRef, onScroll, paused, resumeFollowing } = useAgentScroll(detail);
  const activeRun = detail?.runs.find((run) => isAgentRunning(run.status));
  const hasMessages = !!detail?.messages.length;
  useEffect(() => {
    if (!conversationId) return;
    if (consumeAgentComposerFocus(conversationId)) restoreFocus.current = true;
    if (!restoreFocus.current || loading) return;
    restoreFocus.current = false;
    if (document.activeElement === document.body) composerRef.current?.focus({ preventScroll: true });
  }, [conversationId, loading]);
  const newState = !conversationId || (!loading && !hasMessages && !error);
  const addFiles = (incoming: File[]) => {
    if (files.length + incoming.length > 5) { setActionError("Lampirkan maksimal 5 dokumen dalam satu pesan."); return; }
    const invalid = incoming.map(agentAttachmentError).find(Boolean);
    if (invalid) { setActionError(invalid); return; }
    setActionError("");
    setFiles((previous) => [...previous, ...incoming.filter((file) => !previous.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)).map((file) => ({ key: crypto.randomUUID(), file }))]);
  };
  const send = async (requestContent = content, contextual = false, requestSkills = selectedSkills) => {
    if (!requestContent.trim() || sendLock.current || activeRun || mutationLock.current || disabled) return;
    if (!contextual) { composerRef.current?.focus({ preventScroll: true }); resumeFollowing(); }
    sendLock.current = true; setSending(true); setActionError("");
    const draftFiles = contextual ? [] : files;
    const attempt = contextual ? refreshAttempt : sendAttempt;
    const signature = JSON.stringify({ content: requestContent.trim(), skills: requestSkills, files: draftFiles.map((file) => file.key) });
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    try {
      if (!createdId.current) { const conversation = await agentApi.create(token); createdId.current = conversation.id; }
      if (!mounted.current) return;
      const id = createdId.current;
      const uploaded = [...draftFiles];
      for (let index = 0; index < uploaded.length; index++) {
        if (!uploaded[index].attachmentId) {
          const attachment = await agentApi.upload(id, uploaded[index].file, uploaded[index].key, token);
          uploaded[index] = { ...uploaded[index], attachmentId: attachment.id, warnings: attachment.warnings };
          if (!mounted.current) return;
          setFiles([...uploaded]);
        }
      }
      await agentApi.send(id, { content: requestContent.trim(), skills: requestSkills, attachmentIds: uploaded.map((file) => file.attachmentId!), idempotencyKey: attempt.current!.key }, token);
      if (!mounted.current) return;
      if (!contextual) { setContent(""); setFiles([]); }
      attempt.current = null;
      if (!conversationId) {
        if (!contextual && document.activeElement === composerRef.current) requestAgentComposerFocus(id);
        router.push(`/agent/${encodeURIComponent(id)}`);
      } else reload();
    } catch (cause) { if (mounted.current) { setActionError(agentError(cause)); reload(); } }
    finally { sendLock.current = false; if (mounted.current) setSending(false); }
  };
  const cancel = async () => {
    if (!activeRun || stopping) return;
    setStopping(true); setActionError("");
    try { await agentApi.cancel(conversationId!, activeRun.id, token); if (mounted.current) reload(); }
    catch (cause) { if (mounted.current) setActionError(agentError(cause)); }
    finally { if (mounted.current) setStopping(false); }
  };
  const apply = async (proposal: Proposal, operations: AgentOperation[]) => {
    if (!conversationId || mutationLock.current || sendLock.current) return;
    mutationLock.current = true; setBusyProposal(proposal.id); setActionError("");
    try {
      const changed = JSON.stringify(proposal.operations) !== JSON.stringify(operations);
      const saved = changed ? await agentApi.update(conversationId, proposal.id, proposal.revision, operations, token) : proposal;
      if (!mounted.current) return;
      setDetail((previous) => previous ? { ...previous, proposals: previous.proposals.map((item) => item.id === saved.id ? saved : item) } : previous);
      const revisionKey = `${saved.id}:${saved.revision}`;
      if (!applyKeys.current.has(revisionKey)) applyKeys.current.set(revisionKey, crypto.randomUUID());
      await agentApi.apply(conversationId, saved.id, saved.revision, applyKeys.current.get(revisionKey)!, token);
      if (mounted.current) reload();
    } catch (cause) {
      // A response can be lost after commit. Read the persisted receipt before
      // presenting the attempt as a failure; retry keeps the same revision key.
      try {
        const persisted = await agentApi.detail(conversationId, token);
        if (!mounted.current) return;
        setDetail(persisted);
        if (persisted.proposals.find((item) => item.id === proposal.id)?.status === "applied") { reload(); return; }
      } catch { /* Keep the original, actionable failure if reconciliation is offline. */ }
      if (mounted.current) { setActionError(agentError(cause)); reload(); throw cause; }
    }
    finally { mutationLock.current = false; if (mounted.current) setBusyProposal(undefined); }
  };
  const reject = async (proposal: Proposal) => {
    if (!conversationId || mutationLock.current || sendLock.current) return;
    mutationLock.current = true; setBusyProposal(proposal.id);
    try { await agentApi.reject(conversationId, proposal.id, proposal.revision, token); if (mounted.current) reload(); }
    catch (cause) { if (mounted.current) { setActionError(agentError(cause)); reload(); throw cause; } }
    finally { mutationLock.current = false; if (mounted.current) setBusyProposal(undefined); }
  };
  const refresh = (widget: Widget) => { void send(widget.refreshAction?.prompt ?? agentRefreshRequest(widget), true, widget.refreshAction?.skills ?? selectedSkills); };
  const prepareMessage = (value: string) => { setContent(value); composerRef.current?.focus(); };
  const renderMessage = (message: AgentMessage) => <article key={message.id} className={`agent-message agent-message-${message.role}`} aria-label={message.role === "user" ? "Pesan Anda" : "Jawaban Agent"}>
    {message.content && <div className="agent-message-text">{message.content}</div>}
    {!!message.attachments?.length && <ul className="agent-message-files">{message.attachments.map((attachment) => <li key={attachment.id}><FileText className="size-3.5" aria-hidden="true" />{attachment.name}</li>)}</ul>}
    {message.attachments?.some((attachment) => attachment.warnings?.length) && <ul className="agent-attachment-warnings">{message.attachments.flatMap((attachment) => (attachment.warnings ?? []).map((warning, index) => <li key={`${attachment.id}-${index}`}><span>{attachment.name}: </span>{agentAttachmentWarning(warning)}</li>))}</ul>}
    {(message.widgets ?? []).map((widget) => <AgentWidget key={widget.id} widget={widget} onRefresh={refresh} onClarify={(answer) => { void send(answer, true); }} onAction={(action) => { void send(action.prompt, true, action.skills); }} disabled={!!activeRun || sending || !!busyProposal} />)}
    {conversationId && message.role === "assistant" && message.widgets?.some((widget) => widget.type !== "clarification") && <AgentMessageDownloads conversationId={conversationId} messageId={message.id} token={token} onAccessLost={clearPrivateData} />}
  </article>;
  const composer = <AgentComposer mode={newState ? "start" : "reply"} textareaRef={composerRef} content={content} onContentChange={setContent} skills={skills} selectedSkills={selectedSkills} onSkillsChange={setSelectedSkills} files={files} onFiles={addFiles} onRemoveFile={(key) => setFiles((previous) => previous.filter((file) => file.key !== key))} onSend={() => { void send(); }} onStop={() => { void cancel(); }} disabled={disabled || !!busyProposal || (!!conversationId && (loading || (!detail && !!error)))} sending={sending} running={!!activeRun} stopping={stopping} status={skillsError || undefined} />;
  return <section className={`agent-panel ${!newState && !disabled ? "agent-panel-active" : ""}`} aria-label="Manris Agent">
    {!newState && <AgentConversationHeader title={detail?.conversation.title || "Percakapan baru"} actions={<Button asChild variant="ghost" size="icon-sm" aria-label="Percakapan baru" title="Percakapan baru"><Link href="/agent"><Plus aria-hidden="true" /></Link></Button>}>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" disabled={disabled} className="min-w-0 max-w-full"><span className="truncate">{detail?.conversation.title || "Percakapan baru"}</span><ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-80 max-w-[calc(100vw-2rem)]"><DropdownMenuLabel>Riwayat pribadi</DropdownMenuLabel>{history.slice(0, 20).map((conversation) => <DropdownMenuItem key={conversation.id} asChild><Link href={`/agent/${encodeURIComponent(conversation.id)}`}><span className="min-w-0 flex-1 truncate">{conversation.title || "Percakapan tanpa judul"}</span><AgentHistoryStatus status={conversation.status} /></Link></DropdownMenuItem>)}{!history.length && <p className="px-2 py-2 text-xs text-muted-foreground">Belum ada percakapan.</p>}</DropdownMenuContent></DropdownMenu>
    </AgentConversationHeader>}
    {disabled ? <div className="agent-session-state"><p className="text-base">Manris Agent sedang dinonaktifkan</p><p className="text-sm text-muted-foreground">Fitur AI belum tersedia pada lingkungan ini.</p></div> : <>
      <div ref={scrollRef} onScroll={onScroll} className={`agent-scroll ${newState ? "agent-scroll-new" : ""}`}>
        {loading && conversationId ? <div className="agent-column space-y-6 py-10" role="status" aria-label="Memuat percakapan"><Skeleton className="ml-auto h-16 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-36 w-full" /></div> : null}
        {error && <div className="agent-column agent-error" role="alert"><AlertCircle className="size-4 shrink-0" aria-hidden="true" /><p>{error}</p><Button variant="outline" size="sm" onClick={reload}>Coba lagi</Button></div>}
        {newState && <AgentStart composer={composer}>
          {historyLoading ? <div className="space-y-3" role="status" aria-label="Memuat riwayat percakapan"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div> : historyError ? <div className="agent-history-error"><p>{historyError}</p><Button variant="ghost" size="sm" onClick={reload}>Coba lagi</Button></div> : history.length ? history.map((conversation) => <Link key={conversation.id} href={`/agent/${encodeURIComponent(conversation.id)}`} className="agent-history-row"><span className="agent-history-title"><span className="truncate">{conversation.title || "Percakapan tanpa judul"}</span><AgentHistoryStatus status={conversation.status} /></span><time dateTime={conversation.updatedAt} title={agentDate(conversation.updatedAt)} aria-label={agentDate(conversation.updatedAt)}>{agentRelativeTime(conversation.updatedAt)}</time></Link>) : <AgentSuggestions onSelect={prepareMessage} />}
        </AgentStart>}
        {hasMessages && <AgentConversationLayout startedAt={detail.conversation.createdAt}>{agentConversationTimeline(detail).map((turn) => <div key={turn.id} className="agent-turn">
          {turn.messages.filter((message) => message.role === "user").map(renderMessage)}
          {turn.run ? <div className="agent-run-result"><AgentActivity run={turn.run} onRetry={turn.messages.find((message) => message.role === "user") ? () => prepareMessage(turn.messages.find((message) => message.role === "user")!.content) : undefined} disabled={!!activeRun || sending || !!busyProposal} />
            {turn.messages.filter((message) => message.role === "assistant").map(renderMessage)}
            {detail.proposals.filter((proposal) => proposal.runId === turn.run!.id).map((proposal) => <AgentProposal key={`${proposal.id}:${proposal.revision}:${proposal.status}`} proposal={proposal} busy={busyProposal === proposal.id} disabled={!!activeRun || sending || (!!busyProposal && busyProposal !== proposal.id)} onApply={(operations) => apply(proposal, operations)} onReject={() => reject(proposal)} />)}
          </div> : turn.messages.filter((message) => message.role !== "user").map(renderMessage)}
        </div>)}
        </AgentConversationLayout>}
      </div>
      {paused && hasMessages && <div className="agent-column flex justify-end py-2"><Button type="button" variant="outline" size="sm" onClick={resumeFollowing}>Ke pesan terbaru</Button></div>}
      {actionError && <div className="agent-column agent-action-error" role="alert">{actionError}</div>}
      {!newState && <div className="agent-bottom"><div className="agent-column">{composer}</div></div>}
    </>}
  </section>;
}
