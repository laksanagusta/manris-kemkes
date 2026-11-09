"use client";
import { useState } from "react";
import { DetailSidePanel } from "../layout/detail-side-panel";
import { CommentThreadItem } from "../domain/comment-thread-item";
import { CommentComposer } from "../domain/comment-composer";

export function RiskCommentsExample() {
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState(["Rencana penanganan sudah ditinjau bersama unit terkait.", "Jadwal tindak lanjut akan diperbarui setelah koordinasi."]);
  return (
    <div className="w-full max-w-[420px]">
      <DetailSidePanel>
        <section aria-label="Contoh catatan risiko">
          <h2 className="text-sm font-semibold text-primary">Catatan</h2>
            <div data-comment-thread className="mt-3">
              {comments.map((text, index) => <CommentThreadItem key={index} author={index === 0 ? "Tim pengelola risiko" : "Koordinator unit"} timestamp="7 mnt lalu">{text}</CommentThreadItem>)}
            </div>
          <CommentComposer message={message} onMessageChange={setMessage} onSubmit={() => {
            if (!message.trim()) return;
            setComments(current => [...current, message.trim()]);
            setMessage("");
          }} />
        </section>
      </DetailSidePanel>
    </div>
  );
}
