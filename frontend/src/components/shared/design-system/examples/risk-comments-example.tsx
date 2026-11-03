"use client";
import { useState } from "react";
import { DetailSidePanel } from "../layout/detail-side-panel";
import { CommentThreadItem } from "../domain/comment-thread-item";
import { CommentComposer } from "../domain/comment-composer";

export function RiskCommentsExample() {
  const [message, setMessage] = useState("");
  const [stakeholder, setStakeholder] = useState("");
  const [comments, setComments] = useState(["Rencana penanganan sudah ditinjau bersama unit terkait."]);
  return (
    <div className="w-full max-w-[420px]">
      <DetailSidePanel>
        <section aria-label="Contoh catatan risiko">
          <h2 className="text-sm font-semibold text-primary">Catatan</h2>
          <p className="mt-3 text-sm text-muted-foreground">Contoh interaktif lokal, tanpa menyimpan ke server.</p>
          {comments.map((text, index) => <CommentThreadItem key={index} author="Tim pengelola risiko" timestamp="Contoh">{text}</CommentThreadItem>)}
          <CommentComposer message={message} stakeholder={stakeholder} onMessageChange={setMessage} onStakeholderChange={setStakeholder} onSubmit={() => {
            if (!message.trim() || !stakeholder.trim()) return;
            setComments(current => [...current, message.trim()]);
            setMessage(""); setStakeholder("");
          }} />
        </section>
      </DetailSidePanel>
    </div>
  );
}
