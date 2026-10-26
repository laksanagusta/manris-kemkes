"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { agentApi } from "@/lib/agent-api";
import { ApiError } from "@/lib/api";
import { isAgentRunning } from "@/lib/agent-helpers";
import type { AgentConversation, AgentConversationDetail, AgentSkill } from "@/types/agent";

export function agentError(cause: unknown) { return cause instanceof Error ? cause.message : "Data belum berhasil dimuat. Silakan coba lagi."; }
export function useAgentData(conversationId: string | undefined, token: string, disabled: boolean) {
  const [history, setHistory] = useState<AgentConversation[]>([]);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [detail, setDetail] = useState<AgentConversationDetail | null>(null);
  const [loading, setLoading] = useState(!disabled && !!conversationId);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [skillsError, setSkillsError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(!disabled);
  const [version, setVersion] = useState(0);
  const mounted = useRef(true);
  const accessEpoch = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const clearPrivateData = useCallback(() => {
    accessEpoch.current++;
    setDetail(null); setHistory([]); setLoading(false);
    setError("Akses ke percakapan ini tidak tersedia. Periksa kewenangan Anda atau buka percakapan lain.");
    setVersion((value) => value + 1);
  }, []);
  useEffect(() => {
    if (disabled) return;
    const controller = new AbortController();
    const epoch = accessEpoch.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const load = async () => {
      try {
        if (conversationId) {
          const next = await agentApi.detail(conversationId, token, controller.signal);
          if (cancelled || epoch !== accessEpoch.current) return;
          setDetail(next); setError(""); setLoading(false);
          if (next.runs.some((run) => isAgentRunning(run.status)) || next.proposals.some((proposal) => proposal.status === "applying")) timer = setTimeout(load, 2000);
        } else { setLoading(false); }
      } catch (cause) {
        if (cancelled || epoch !== accessEpoch.current) return;
        if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) setDetail(null);
        setError(agentError(cause)); setLoading(false);
        // Reconnect without discarding the last persisted results.
        if (conversationId && !(cause instanceof ApiError && [401, 403, 404, 503].includes(cause.status))) timer = setTimeout(load, 2000);
      }
    };
    void load();
    return () => { cancelled = true; controller.abort(); if (timer) clearTimeout(timer); };
  }, [conversationId, token, disabled, version]);
  useEffect(() => {
    if (disabled) return;
    const controller = new AbortController();
    const epoch = accessEpoch.current;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pollHistory = async () => {
      try {
        const next = await agentApi.conversations(token, controller.signal);
        if (cancelled || epoch !== accessEpoch.current) return;
        setHistory(next ?? []); setHistoryError("");
        if (next?.some((conversation) => isAgentRunning(conversation.status))) timer = setTimeout(pollHistory, 2000);
      } catch (cause) {
        if (cancelled || epoch !== accessEpoch.current) return;
        if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) setHistory([]);
        setHistoryError(agentError(cause));
      }
    };
    Promise.allSettled([agentApi.conversations(token, controller.signal), agentApi.skills(token, controller.signal)]).then(([historyResult, skillsResult]) => {
      if (cancelled || epoch !== accessEpoch.current) return;
      setHistoryLoading(false);
      if (historyResult.status === "fulfilled") {
        setHistory(historyResult.value ?? []); setHistoryError("");
        if (historyResult.value?.some((conversation) => isAgentRunning(conversation.status))) timer = setTimeout(pollHistory, 2000);
      } else {
        if (historyResult.reason instanceof ApiError && [401, 403, 404].includes(historyResult.reason.status)) setHistory([]);
        setHistoryError(agentError(historyResult.reason));
      }
      if (skillsResult.status === "fulfilled") { setSkills(skillsResult.value ?? []); setSkillsError(""); } else setSkillsError("Daftar Skills belum tersedia. Pemilihan otomatis tetap digunakan.");
    });
    return () => { cancelled = true; controller.abort(); if (timer) clearTimeout(timer); };
  }, [token, disabled, version]);
  return { history, skills, detail, setDetail, loading, error, historyError, historyLoading, skillsError, reload, clearPrivateData, mounted };
}
