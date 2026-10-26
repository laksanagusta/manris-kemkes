import type { ReactNode } from "react";

const suggestions = [
  "Ringkas profil risiko unit saya",
  "Tinjau mitigasi yang terlambat",
  "Bantu analisis dokumen risiko",
];

/** Shared start-page composition; data and sending remain owned by the caller. */
export function AgentStart({ composer, children }: { composer: ReactNode; children: ReactNode }) {
  return (
    <div className="agent-new-content agent-column">
      <div className="agent-new-workspace">
        <header className="agent-new-intro">
          <h1>Apa yang ingin Anda kerjakan?</h1>
          <p>Telusuri data, pahami risiko, dan susun tindak lanjut.</p>
        </header>
        {composer}
      </div>
      <section className="agent-history" aria-label="Riwayat percakapan">
        {children}
      </section>
    </div>
  );
}

export function AgentSuggestions({ onSelect }: { onSelect: (value: string) => void }) {
  return (
    <div className="agent-suggestions">
      <p>Mulai dari data yang Anda perlukan.</p>
      <ul>{suggestions.map((suggestion) => <li key={suggestion}><button type="button" onClick={() => onSelect(suggestion)}>{suggestion}</button></li>)}</ul>
    </div>
  );
}
