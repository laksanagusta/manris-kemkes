"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Actions = ReactNode;

const ActionsCtx = createContext<Actions>(null);
const SetActionsCtx = createContext<(a: Actions) => void>(() => {});

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<Actions>(null);
  return (
    <SetActionsCtx.Provider value={setActions}>
      <ActionsCtx.Provider value={actions}>
        {children}
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
