const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/(app)/risk/register/new/page.tsx', 'utf-8');

// 1. Add imports
const newImports = `
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
`;
content = content.replace('import { Separator } from "@/components/ui/separator";', `import { Separator } from "@/components/ui/separator";${newImports}`);

// 2. Add openSections state and update scrollToSection
content = content.replace(
  'const [assessmentCycleDisplay, setAssessmentCycleDisplay] = useState(',
  'const [openSections, setOpenSections] = useState<string[]>(["identifikasi"]);\n  const [assessmentCycleDisplay, setAssessmentCycleDisplay] = useState('
);

content = content.replace(
  /const scrollToSection = \(sectionId: SectionId\) => \{[\s\S]*?\}\;/g,
  `const scrollToSection = (sectionId: SectionId) => {
    if (typeof document === "undefined") return;
    setOpenSections((prev) => Array.from(new Set([...prev, sectionId])));
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const offset = 120;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    }, 100);
  };`
);

// 3. Button Hierarchy (actions inside FormHeader)
const actionsRegex = /actions=\{[\s\S]*?\n\s*\}\n\s*\/\>/;
const newActions = `actions={
          <div className="flex items-center gap-2 sm:gap-3">
            {riskId &&
              (riskStatus === "in_review" ||
                riskStatus === "in_approval" ||
                riskStatus === "approved" ||
                riskStatus === "rejected") && (
                <Button
                  variant="outline"
                  className="gap-2 text-xs text-destructive hover:bg-destructive/10"
                  onClick={handleRevertToDraft}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ArrowLeft className="size-3.5 rounded-full border border-current p-0.5" />
                  )}{" "}
                  <span className="hidden sm:inline">Kembalikan ke draft</span>
                </Button>
              )}

            {riskId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      onClick={() => showUnavailableFeatureToast("Riwayat versi")}
                    >
                      <History className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Riwayat versi</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {(riskStatus === "draft" || !riskId) && (
              <div className="flex items-center gap-2 border-l border-border/40 pl-2 sm:pl-3 ml-1 sm:ml-2">
                {riskId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Hapus draft</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Button
                  variant="outline"
                  className="gap-2 text-xs font-medium border-primary/20 hover:bg-primary/5 hover:text-primary"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                >
                  {isSubmitting && submitTarget.current === "draft" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}{" "}
                  Simpan draft
                </Button>
                <Button
                  className="gap-2 text-sm font-semibold px-5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    submitTarget.current = "review";
                    clearErrors();
                    if (!reviewerId) {
                      toast.error("Pilih Reviewer terlebih dahulu.");
                      return;
                    }
                    if (!isFinalizeReady) {
                       const firstMissing = missingSections[0]?.id ?? "identifikasi";
                       scrollToSection(firstMissing);
                       return;
                    }
                    handleSubmit(onSubmit, onValidationError)();
                  }}
                  disabled={isSubmitting || !isFinalizeReady}
                >
                  {isSubmitting && submitTarget.current === "review" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}{" "}
                  Ajukan review
                </Button>
              </div>
            )}
          </div>
        }
      />`;
content = content.replace(actionsRegex, newActions);

// 4. Accordion wrapper
content = content.replace(
  '<form\n            onSubmit={(e) => e.preventDefault()}\n            className="w-full space-y-6 xl:w-2/3"\n          >',
  '<form\n            onSubmit={(e) => e.preventDefault()}\n            className="w-full xl:w-2/3"\n          >\n            <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-6">'
);
content = content.replace(
  '          </form>\n\n          <div className="w-full space-y-4 xl:sticky xl:top-24 xl:w-1/3">',
  '            </Accordion>\n          </form>\n\n          <div className="w-full space-y-4 xl:sticky xl:top-24 xl:w-1/3">'
);

// Replace Cards with AccordionItems
const sections = [
  { id: "identifikasi", step: "1", title: "Identifikasi Risiko", index: 0 },
  { id: "analisis", step: "2", title: "Analisis Risiko", index: 1 },
  { id: "evaluasi", step: "3", title: "Evaluasi Risiko", index: 2 },
  { id: "penanganan", step: "4", title: "Rencana Penanganan", index: 3 },
  { id: "target", step: "5", title: "Target Penurunan", index: 4, overrideReady: "sectionStatuses[4].done && sectionStatuses[5].done" },
  { id: "approval-line", step: "6", title: "Approval Line", index: 5, overrideReady: "approvalLine.length > 0" }
];

sections.forEach(s => {
  const readyRegexStr = s.overrideReady ? s.overrideReady.replace(/\./g, '\\.').replace(/\[/g, '\\[').replace(/\]/g, '\\]') : `sectionStatuses\\[${s.index}\\]\\.done`;
  const regex = new RegExp(
    `<Card\\s*id="${s.id}"\\s*className="scroll-mt-28[^"]*"\\s*>\\s*<SectionHeader\\s*step="${s.step}"\\s*title="${s.title}"\\s*ready=\\{${readyRegexStr}\\}\\s*/>\\s*<CardContent className="([^"]+)">`, 
    'g'
  );
  
  content = content.replace(regex, (match, contentClassName) => {
    const readyCondition = s.overrideReady ? s.overrideReady : `sectionStatuses[${s.index}].done`;
    
    return `<AccordionItem value="${s.id}" id="${s.id}" className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                <div className="flex flex-1 items-center justify-between pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">${s.step}</div>
                    <p className="text-sm md:text-base font-semibold text-foreground transition-colors">${s.title}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                      ${readyCondition}
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {${readyCondition} ? <CheckCircle2 className="size-3.5" /> : <CircleDot className="size-3.5" />}
                    <span className="hidden sm:inline">{${readyCondition} ? "Siap" : "Perlu dilengkapi"}</span>
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="${contentClassName} px-5 pb-6 pt-2">`;
  });
});

// Close AccordionItems
const parts = content.split(/<\/CardContent>\s*<\/Card>/);
if (parts.length === 9) { // 8 matches
  content = parts[0] + '</CardContent>\n      </Card>' +
            parts[1] + '</AccordionContent>\n            </AccordionItem>' +
            parts[2] + '</AccordionContent>\n            </AccordionItem>' +
            parts[3] + '</AccordionContent>\n            </AccordionItem>' +
            parts[4] + '</AccordionContent>\n            </AccordionItem>' +
            parts[5] + '</AccordionContent>\n            </AccordionItem>' +
            parts[6] + '</AccordionContent>\n            </AccordionItem>' +
            parts[7] + '</CardContent>\n            </Card>' + 
            parts[8];
} else {
  console.log('Error: Found ' + (parts.length - 1) + ' closing tags instead of 8.');
}

// 5. Score Result card more prominent (Analisis)
const oldScoreAnalisisRegex = /<div\s+className=\{cn\(\s*"flex items-center justify-between rounded-lg border p-4",\s*levelToColor\(currentPrimarySnapshot.level\),\s*\)\}\s*>\s*<div className="text-left">\s*<p className="text-xs font-semibold">Hasil Asesmen<\/p>\s*<p className="text-xs text-muted-foreground mt-1">\s*Bobot: \{currentPrimarySnapshot.weight.toFixed\(2\)\} \| Prioritas: \{currentPrimarySnapshot.priority\}\s*<\/p>\s*<\/div>\s*<div className="text-right">\s*<p className="text-lg font-bold">\s*\{getRiskLevelLabel\(currentPrimarySnapshot.level\)\}\s*<\/p>\s*<p className="text-xs font-mono">\s*\{currentScoreLabel\}: \{currentPrimarySnapshot.score\}\s*<\/p>\s*<\/div>\s*<\/div>/g;

const newScoreAnalisis = `<div
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border-2 p-5 sm:p-6 mt-8 relative overflow-hidden",
                    levelToColor(currentPrimarySnapshot.level).replace("text-", "border-").replace("bg-", "bg-opacity-10 bg-")
                  )}
                >
                  <div className={cn("absolute inset-0 opacity-10", levelToColor(currentPrimarySnapshot.level).split(' ').find(c=>c.startsWith('bg-')))}></div>
                  <div className="text-left relative z-10 mb-4 sm:mb-0">
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Hasil Asesmen</p>
                    <p className="text-sm text-foreground/80 mt-1 font-medium">
                      Bobot: <span className="font-semibold text-foreground">{currentPrimarySnapshot.weight.toFixed(2)}</span> &bull; Prioritas: <span className="font-semibold text-foreground">{currentPrimarySnapshot.priority}</span>
                    </p>
                  </div>
                  <div className="text-left sm:text-right relative z-10 flex flex-col sm:items-end">
                    <p className={cn("text-3xl font-black tracking-tight", levelToColor(currentPrimarySnapshot.level).split(' ').find(c=>c.startsWith('text-')))}>
                      {getRiskLevelLabel(currentPrimarySnapshot.level)}
                    </p>
                    <div className="flex items-center sm:justify-end gap-2 mt-1">
                      <p className="text-sm font-semibold text-muted-foreground">{currentScoreLabel}:</p>
                      <p className="text-xl font-bold font-mono">{currentPrimarySnapshot.score}</p>
                    </div>
                  </div>
                </div>`;
content = content.replace(oldScoreAnalisisRegex, newScoreAnalisis);

// Do the same for Target Penurunan (Issue 4)
const oldScoreTargetRegex = /<div\s+className=\{cn\(\s*"flex items-center justify-between rounded-lg border p-4",\s*levelToColor\(targetLevel\),\s*\)\}\s*>\s*<div className="text-left">\s*<p className="text-xs font-semibold">Target Residual Risk<\/p>\s*<p className="text-xs text-muted-foreground mt-1">\s*Bobot: \{targetWeight.toFixed\(2\)\} \| Prioritas: \{targetPriority\}\s*<\/p>\s*<\/div>\s*<div className="text-right">\s*<p className="text-lg font-bold">\s*\{getRiskLevelLabel\(targetLevel\)\}\s*<\/p>\s*<p className="text-xs font-mono">Skor Target: \{Math.round\(targetNilai\)\}<\/p>\s*<\/div>\s*<\/div>/g;

const newScoreTarget = `<div
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border-2 p-4 sm:p-5 mt-6 relative overflow-hidden border-dashed",
                    levelToColor(targetLevel).replace("text-", "border-").replace("bg-", "bg-opacity-5 bg-")
                  )}
                >
                  <div className={cn("absolute inset-0 opacity-5", levelToColor(targetLevel).split(' ').find(c=>c.startsWith('bg-')))}></div>
                  <div className="text-left relative z-10 mb-3 sm:mb-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Residual Risk</p>
                    <p className="text-xs text-foreground/80 mt-1 font-medium">
                      Bobot: <span className="font-semibold text-foreground">{targetWeight.toFixed(2)}</span> &bull; Prioritas: <span className="font-semibold text-foreground">{targetPriority}</span>
                    </p>
                  </div>
                  <div className="text-left sm:text-right relative z-10 flex flex-col sm:items-end">
                    <p className={cn("text-2xl font-black tracking-tight", levelToColor(targetLevel).split(' ').find(c=>c.startsWith('text-')))}>
                      {getRiskLevelLabel(targetLevel)}
                    </p>
                    <div className="flex items-center sm:justify-end gap-2 mt-0.5">
                      <p className="text-xs font-semibold text-muted-foreground">Skor Target:</p>
                      <p className="text-lg font-bold font-mono">{Math.round(targetNilai)}</p>
                    </div>
                  </div>
                </div>`;
content = content.replace(oldScoreTargetRegex, newScoreTarget);

// 6. Issue 5: Approval Line separation
const oldApprovalRegex = /<div className="space-y-1.5 pb-4 border-b border-border\/20">\s*<Label className="text-sm font-medium">\s*Reviewer \(Pemeriksa\)\s*<span className="text-destructive ml-0.5">\*<\/span>\s*<\/Label>\s*<p className="text-xs text-muted-foreground mb-2">\s*Pilih reviewer yang akan memeriksa dan memberikan skor penilaian sebelum risk ini disetujui.\s*<\/p>\s*<Select\s*value=\{reviewerId\}\s*onValueChange=\{setReviewerId\}\s*disabled=\{isRiskLocked\}\s*>\s*<SelectTrigger className="h-9 text-sm md:w-\[320px\]">\s*<SelectValue placeholder="Pilih reviewer" \/>\s*<\/SelectTrigger>\s*<SelectContent>\s*\{availableUsers\s*\.filter\(\(u\) => u.role === "reviewer"\)\s*\.map\(\(u\) => \(\s*<SelectItem key=\{u.id\} value=\{u.id\} className="text-sm">\s*\{u.name\}\s*<\/SelectItem>\s*\)\)\}\s*<\/SelectContent>\s*<\/Select>\s*<\/div>\s*<div className="pt-6">\s*<Label className="text-sm font-medium">\s*Approval Line \(Pimpinan\)\s*<span className="text-destructive ml-0.5">\*<\/span>\s*<\/Label>\s*<p className="text-xs text-muted-foreground mb-3 mt-1">\s*Pilih urutan user yang akan approve risk ini. Approver pertama\s*harus approve dulu sebelum approver berikutnya aktif.\s*<\/p>/g;

const newApproval = `<div className="rounded-xl border border-border/60 bg-muted/10 p-5 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">
                      1. Reviewer (Pemeriksa)
                      <span className="text-destructive ml-0.5">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Pilih reviewer yang akan memeriksa dan memberikan skor penilaian resmi sebelum risiko ini diajukan ke pimpinan.
                    </p>
                  </div>
                  <Select
                    value={reviewerId}
                    onValueChange={setReviewerId}
                    disabled={isRiskLocked}
                  >
                    <SelectTrigger className="h-10 text-sm md:w-[360px] bg-background">
                      <SelectValue placeholder="Pilih reviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers
                        .filter((u) => u.role === "reviewer")
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-sm">
                            {u.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border border-primary/10 bg-primary/[0.02] p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">
                      2. Approval Line (Pimpinan)
                      <span className="text-destructive ml-0.5">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Susun rantai persetujuan pimpinan. Persetujuan dilakukan secara berurutan.
                    </p>
                  </div>`;

content = content.replace(oldApprovalRegex, newApproval);

fs.writeFileSync('frontend/src/app/(app)/risk/register/new/page.tsx', content);
console.log('Refactoring applied.');
