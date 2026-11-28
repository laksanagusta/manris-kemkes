"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Actions = ReactNode;

const ActionsCtx = createContext<Actions>(null);
const SetActionsCtx = createContext<(a: Actions) => void>(() => {});
const HeaderBackCtx = createContext<ReactNode>(null);
const SetHeaderBackCtx = createContext<(back: ReactNode) => void>(() => {});
const HeaderTabPortalTargetCtx = createContext<HTMLElement | null>(null);

export function HeaderTabPortalTargetProvider({
  target,
  children,
}: {
  target: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <HeaderTabPortalTargetCtx.Provider value={target}>
      {children}
    </HeaderTabPortalTargetCtx.Provider>
  );
}

export function useHeaderTabPortalTarget() {
  return useContext(HeaderTabPortalTargetCtx);
}

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<Actions>(null);
  const [back, setBack] = useState<ReactNode>(null);
  return (
    <SetActionsCtx.Provider value={setActions}>
      <ActionsCtx.Provider value={actions}>
        <SetHeaderBackCtx.Provider value={setBack}>
          <HeaderBackCtx.Provider value={back}>{children}</HeaderBackCtx.Provider>
        </SetHeaderBackCtx.Provider>
      </ActionsCtx.Provider>
    </SetActionsCtx.Provider>
  );
}

export function useHeaderActions() {
  return useContext(ActionsCtx);
}

export function useSetHeaderActions() {
  return useContext(SetActionsCtx);
}

export function useHeaderBack() {
  return useContext(HeaderBackCtx);
}

export function useSetHeaderBack() {
  return useContext(SetHeaderBackCtx);
}
