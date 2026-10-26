"use client";

import { useId, useRef, type KeyboardEvent, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUp, AttachmentIcon, ChevronDown, FileText, Layers3, Loader2, X } from "@/components/shared/icons";
import type { AgentSkill, AgentSkillId } from "@/types/agent";
import { agentAttachmentWarning } from "@/lib/agent-helpers";

export interface AgentDraftFile { key: string; file: File; attachmentId?: string; warnings?: string[] }
interface AgentComposerProps {
  content: string; onContentChange: (value: string) => void;
  skills: AgentSkill[]; selectedSkills: AgentSkillId[]; onSkillsChange: (value: AgentSkillId[]) => void;
  files: AgentDraftFile[]; onFiles: (files: File[]) => void; onRemoveFile: (key: string) => void;
  onSend: () => void; onStop?: () => void; disabled?: boolean; sending?: boolean; running?: boolean; stopping?: boolean;
  placeholder?: string; status?: string;
  mode?: "start" | "reply";
  textareaRef?: Ref<HTMLTextAreaElement>;
}
export function AgentComposer({ content, onContentChange, skills, selectedSkills, onSkillsChange, files, onFiles, onRemoveFile, onSend, onStop, disabled, sending, running, stopping, placeholder = "Tanyakan tentang risiko, mitigasi, atau kejadian…", status, textareaRef, mode = "start" }: AgentComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const blocked = disabled || sending || running;
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!blocked && content.trim()) onSend();
    }
  };
  return (
    <div className="agent-composer-wrap">
      <label htmlFor={id} className="sr-only">Pesan untuk Manris Agent</label>
      <InputGroup data-agent-composer data-mode={mode} aria-busy={sending || undefined}>
        <InputGroupTextarea ref={textareaRef} id={id} value={content} onChange={(event) => onContentChange(event.target.value)} onKeyDown={onKeyDown} disabled={disabled} readOnly={sending} placeholder={placeholder} rows={mode === "reply" ? 2 : 3} maxLength={16000} />
        {files.length > 0 && <div className="agent-attachments">
          {files.map((item) => <div className="agent-attachment" key={item.key}>
            <FileText className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.file.name}</span>
            <span className="text-tertiary-foreground">{Math.ceil(item.file.size / 1024)} KB</span>
            <Button type="button" size="icon-xs" variant="ghost" disabled={sending} aria-label={`Hapus lampiran ${item.file.name}`} onClick={() => onRemoveFile(item.key)}><X aria-hidden="true" /></Button>
          </div>)}
        </div>}
        <InputGroupAddon align="block-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton disabled={disabled || sending} aria-label="Pilih Skills"><Layers3 aria-hidden="true" />{selectedSkills.length ? `${selectedSkills.length} Skills` : "Skills otomatis"}<ChevronDown aria-hidden="true" /></InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Fokus pekerjaan</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={selectedSkills.length === 0} onSelect={(event) => event.preventDefault()} onCheckedChange={() => onSkillsChange([])}>Otomatis sesuai permintaan</DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {skills.map((skill) => <DropdownMenuCheckboxItem key={skill.id} checked={selectedSkills.includes(skill.id)} onSelect={(event) => event.preventDefault()} onCheckedChange={(checked) => onSkillsChange(checked ? [...selectedSkills, skill.id] : selectedSkills.filter((id) => id !== skill.id))}>
                <span><span className="block">{skill.name}</span><span className="block text-xs text-muted-foreground">{skill.description}</span></span>
              </DropdownMenuCheckboxItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto flex items-center gap-1">
            <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.pdf,.xlsx" multiple onChange={(event) => { onFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
            <InputGroupButton disabled={disabled || sending} size="icon-sm" aria-label="Lampirkan PDF atau Excel, maksimal 1 MB" title="PDF atau Excel · maksimal 1 MB" onClick={() => fileRef.current?.click()}><AttachmentIcon aria-hidden="true" /></InputGroupButton>
            {running ? <InputGroupButton variant="outline" disabled={stopping} onClick={onStop}>{stopping && <Loader2 className="animate-spin" aria-hidden="true" />}Hentikan</InputGroupButton> : <InputGroupButton type="button" variant="default" size="icon-sm" className="rounded-full" disabled={blocked || !content.trim()} aria-label="Kirim pesan" onClick={onSend}>{sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}</InputGroupButton>}
          </div>
        </InputGroupAddon>
      </InputGroup>
      {files.some((file) => file.warnings?.length) && <ul className="agent-attachment-warnings" role="status">{files.flatMap((file) => (file.warnings ?? []).map((warning, index) => <li key={`${file.key}-${index}`}><span>{file.file.name}: </span>{agentAttachmentWarning(warning)}</li>))}</ul>}
      {status && <p className="agent-composer-note" role="status">{status}</p>}
    </div>
  );
}
