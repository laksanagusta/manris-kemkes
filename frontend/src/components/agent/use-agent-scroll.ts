"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { isAgentNearBottom } from "@/lib/agent-helpers";
import { agentScrollContentKey } from "@/lib/agent-scroll-state";
import type { AgentConversationDetail } from "@/types/agent";

export function useAgentScroll(detail: AgentConversationDetail | null) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const readingDetails = useRef(false);
  const [paused, setPaused] = useState(false);
  const contentKey = agentScrollContentKey(detail);
  const onScroll = useCallback(() => {
    if (!scrollRef.current || readingDetails.current) return;
    following.current = isAgentNearBottom(scrollRef.current);
    setPaused(!following.current);
  }, []);
  const resumeFollowing = useCallback(() => {
    readingDetails.current = false;
    following.current = true;
    setPaused(false);
    const viewport = scrollRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, []);
  useLayoutEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const pause = (event: Event) => {
      if (!(event.target instanceof Element) || !event.target.closest("summary, input, textarea, select, button, [role=combobox], [role=checkbox]")) return;
      readingDetails.current = true;
      following.current = false;
      setPaused(true);
    };
    const manualScroll = () => { readingDetails.current = false; };
    const scrollKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [role=combobox]")) return;
      if (["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "].includes(event.key)) manualScroll();
    };
    viewport.addEventListener("pointerdown", pause, true);
    viewport.addEventListener("focusin", pause);
    viewport.addEventListener("wheel", manualScroll, { passive: true });
    viewport.addEventListener("touchmove", manualScroll, { passive: true });
    viewport.addEventListener("keydown", scrollKey);
    return () => {
      viewport.removeEventListener("pointerdown", pause, true);
      viewport.removeEventListener("focusin", pause);
      viewport.removeEventListener("wheel", manualScroll);
      viewport.removeEventListener("touchmove", manualScroll);
      viewport.removeEventListener("keydown", scrollKey);
    };
  }, []);
  useLayoutEffect(() => {
    const viewport = scrollRef.current;
    if (viewport && contentKey && following.current) viewport.scrollTop = viewport.scrollHeight;
  }, [contentKey]);
  return { scrollRef, onScroll, paused, resumeFollowing };
}
