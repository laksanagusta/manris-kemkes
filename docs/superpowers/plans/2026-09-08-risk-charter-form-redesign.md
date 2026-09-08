# Risk Charter Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the shared Risk Charter create/detail form as a one-column Manris form built from canonical design-system components without changing its API contract.

**Architecture:** Keep create and detail modes in the existing dynamic route component. Replace the manually composed long card with one identity `FormSection` plus five data-driven narrative `FormSection` surfaces, centralize status/loading/error presentation through shared primitives, and keep React Hook Form as the source of field state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, React Hook Form, Zod, Tailwind CSS 4, Node test runner, ESLint.

---

## File map

- Modify `frontend/src/app/(app)/management/charters/[id]/page.tsx`: refactor the create/detail form structure, shared states, status badge, save action, and narrative field rendering.
- Create `frontend/src/app/(app)/management/charters/[id]/page.test.ts`: protect the shared-component, one-column, field, state, and API contracts.
- Modify `frontend/src/components/shared/design-system/index.ts`: expose the existing shadcn `Label` primitive through the canonical design-system barrel.
- Modify `frontend/src/app/(app)/design-system/page.tsx`: document the Risk Charter form composition in the Form Page Container catalogue section.
- Modify `DESIGN.md`: add the canonical Risk Charter form rule beside the Piagam Manris collection rule.

### Task 1: Add the failing Risk Charter form contract

**Files:**
- Create: `frontend/src/app/(app)/management/charters/[id]/page.test.ts`
- Read: `frontend/src/app/(app)/management/charters/[id]/page.tsx`
- Read: `frontend/src/components/shared/design-system/index.ts`

- [ ] **Step 1: Write the route contract test**

Create `frontend/src/app/(app)/management/charters/[id]/page.test.ts` with:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const source = readSource("./page.tsx");
const designSystemBarrel = readSource(
  "../../../../../components/shared/design-system/index.ts",
);

test("risk charter create and detail share the canonical one-column form", () => {
  assert.match(source, /const isCreateMode = id === "new"/);
  assert.match(source, /<FormPage className="max-w-5xl">/);
  assert.match(source, /<FormHeader/);
  assert.doesNotMatch(source, /xl:grid-cols-/);

  const orderedSections = [
    "Identitas Piagam",
    "Ruang Lingkup",
    "Dasar Hukum",
    "Konteks Internal",
    "Konteks Eksternal",
    "Ringkasan Stakeholder",
  ];

  let previousIndex = -1;
  for (const title of orderedSections) {
    const nextIndex = source.indexOf(title);
    assert.ok(nextIndex > previousIndex, `${title} must follow the approved order`);
    previousIndex = nextIndex;
  }

  assert.match(source, /<FormSection/);
  assert.doesNotMatch(source, /<Card(?:\s|>)/);
  assert.doesNotMatch(source, /<CardContent(?:\s|>)/);
  assert.doesNotMatch(source, /<Separator(?:\s|>)/);
});

test("risk charter form consumes shared status, state, action, and field primitives", () => {
  for (const component of [
    "CollectionErrorState",
    "CollectionLoadingState",
    "CollectionStatusBadge",
    "LoadingActionButton",
    "Textarea",
    "Label",
  ]) {
    assert.match(source, new RegExp(component));
  }

  assert.match(
    designSystemBarrel,
    /export \{ Label \} from "@\/components\/ui\/label"/,
  );
  assert.doesNotMatch(source, /from "@\/components\/ui\/(?:badge|button|card|label|textarea)"/);
  assert.doesNotMatch(source, /getCharterStatusBadgeClass/);
  assert.doesNotMatch(source, /Risk Governance/);
});

test("risk charter fields and persistence contract remain intact", () => {
  for (const field of [
    "scope",
    "legalBasis",
    "internalContext",
    "externalContext",
    "stakeholderSummary",
  ]) {
    assert.match(source, new RegExp(`field: "${field}"`));
    assert.match(source, new RegExp(`form\\.register\\(section\\.field`));
  }

  assert.match(source, /createRiskCharter\(activeToken, payload\)/);
  assert.match(source, /updateRiskCharter\(activeToken, id, payload\)/);
  assert.match(source, /window\.addEventListener\("beforeunload"/);
  assert.match(source, /loading=\{saving\}/);
  assert.match(source, /<CollectionLoadingState/);
  assert.match(source, /<CollectionErrorState/);
});
```

- [ ] **Step 2: Run the contract test and confirm it fails**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node 'src/app/(app)/management/charters/[id]/page.test.ts'
```

Expected: FAIL because the current page still contains the manually composed `Card`, route-local badge styles, direct UI imports, and no design-system `Label` export.

- [ ] **Step 3: Commit only the failing test**

```bash
git add 'frontend/src/app/(app)/management/charters/[id]/page.test.ts'
git commit -m "test: define risk charter form design contract"
```

### Task 2: Refactor the form into canonical shared sections

**Files:**
- Modify: `frontend/src/app/(app)/management/charters/[id]/page.tsx`
- Modify: `frontend/src/components/shared/design-system/index.ts`
- Test: `frontend/src/app/(app)/management/charters/[id]/page.test.ts`

- [ ] **Step 1: Export the existing Label primitive from the design-system barrel**

Add this beside the existing `Input` and `Textarea` exports in
`frontend/src/components/shared/design-system/index.ts`:

```ts
export { Label } from "@/components/ui/label";
```

- [ ] **Step 2: Replace route-local visual imports with shared primitives**

In `frontend/src/app/(app)/management/charters/[id]/page.tsx`, reduce the icon import to the icon still needed by the primary save action:

```ts
import { Save } from "@/components/ui/icons";
```

Keep `FormHeader`, `FormPage`, and `FormSection` from the shared form shell:

```ts
import {
  FormHeader,
  FormPage,
  FormSection,
} from "@/components/shared/form-shell";
```

Replace the direct `Badge`, `Button`, `Textarea`, `Card`, `CardContent`, and
`Separator` imports with:

```ts
import {
  CollectionErrorState,
  CollectionLoadingState,
  CollectionStatusBadge,
  Label,
  LoadingActionButton,
  Textarea,
} from "@/components/shared/design-system";
```

Delete the unused `cn` import.

- [ ] **Step 3: Replace local status styling with semantic shared tones**

Keep the existing labels and replace `getCharterStatusBadgeClass` with:

```ts
const charterStatusTone: Record<
  string,
  "neutral" | "success" | "warning" | "danger"
> = {
  draft: "neutral",
  in_review: "warning",
  active: "success",
  archived: "neutral",
};
```

- [ ] **Step 4: Define the five narrative sections as typed data**

Replace `SectionId` and the completion-oriented `sections` memo with:

```ts
type NarrativeField =
  | "scope"
  | "legalBasis"
  | "internalContext"
  | "externalContext"
  | "stakeholderSummary";

const narrativeSections: Array<{
  field: NarrativeField;
  title: string;
  description: string;
  placeholder: string;
}> = [
  {
    field: "scope",
    title: "Ruang Lingkup",
    description:
      "Tetapkan proses, unit, area kerja, dan batasan yang termasuk dalam piagam.",
    placeholder:
      "Jelaskan proses, unit, area kerja, serta batasan yang termasuk dalam piagam.",
  },
  {
    field: "legalBasis",
    title: "Dasar Hukum",
    description:
      "Catat regulasi, keputusan, pedoman, atau mandat yang menjadi landasan piagam.",
    placeholder:
      "Cantumkan nama, nomor, dan tahun regulasi atau keputusan yang relevan.",
  },
  {
    field: "internalContext",
    title: "Konteks Internal",
    description:
      "Ringkas struktur, kapasitas, budaya risiko, dan isu operasional organisasi.",
    placeholder:
      "Tuliskan kondisi internal yang memengaruhi pengelolaan risiko.",
  },
  {
    field: "externalContext",
    title: "Konteks Eksternal",
    description:
      "Ringkas faktor regulasi, sosial, lintas instansi, dan lingkungan eksternal.",
    placeholder:
      "Tuliskan kondisi eksternal yang memengaruhi pengelolaan risiko.",
  },
  {
    field: "stakeholderSummary",
    title: "Ringkasan Stakeholder",
    description:
      "Identifikasi pihak utama, ekspektasi, peran, dan keterkaitannya dengan piagam.",
    placeholder:
      "Ringkas stakeholder utama, ekspektasi, serta perannya dalam pengelolaan risiko.",
  },
];
```

- [ ] **Step 5: Add an explicit recoverable load-error state**

Add page state:

```ts
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState<string | null>(null);
```

Replace the existing `useState(!isCreateMode)` loading initializer so create
mode also waits for organization context before rendering the identity values.

Move the existing load body into a `useCallback` named `loadData`. At the start
of each attempt, clear the previous error. On failure, retain the page and set
the error instead of redirecting:

```ts
const loadData = useCallback(async () => {
  if (!token) return;

  const activeToken = token;
  try {
    setLoading(true);
    setLoadError(null);
    const [orgs, currentCharter] = await Promise.all([
      listAllOrganizations(activeToken),
      isCreateMode ? Promise.resolve(null) : getRiskCharter(activeToken, id),
    ]);

    setOrganizations(orgs);
    setCharter(currentCharter);
    form.reset(
      normalizeFormValues(currentCharter, {
        organizationId:
          currentCharter?.organizationId ?? user?.organizationId ?? "",
        uprLevel:
          currentCharter?.uprLevel ??
          (orgs.find(
            (organization) => organization.id === user?.organizationId,
          )?.uprLevel as RiskCharterUPRLevel | undefined) ??
          "upr_t1",
        period: currentCharter?.period ?? currentAssessmentCycle(),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat piagam.";
    setLoadError(message);
    toast.error(message);
  } finally {
    setLoading(false);
  }
}, [form, id, isCreateMode, token, user?.organizationId]);

useEffect(() => {
  void loadData();
}, [loadData]);
```

Update the React import to include `useCallback`, and keep `useRouter` because
navigation is still used by the back action and successful save.

- [ ] **Step 6: Replace loading and failure rendering with shared states**

Use the ordinary form shell for both states:

```tsx
if (loading) {
  return (
    <FormPage className="max-w-5xl">
      <CollectionLoadingState message="Memuat detail piagam..." />
    </FormPage>
  );
}

if (loadError) {
  return (
    <FormPage className="max-w-5xl">
      <FormHeader
        title={isCreateMode ? "Buat Piagam" : "Detail Piagam"}
        subtitle="Tetapkan mandat dan konteks pengelolaan risiko organisasi."
        onBack={() => router.push("/management/charters")}
        backLabel="Kembali ke Piagam"
      />
      <CollectionErrorState
        title="Gagal memuat piagam"
        message={loadError}
        onReload={() => void loadData()}
      />
    </FormPage>
  );
}
```

- [ ] **Step 7: Build the canonical header and identity section**

Replace the current `FormHeader` props with:

```tsx
<FormHeader
  title={isCreateMode ? "Buat Piagam" : "Detail Piagam"}
  subtitle="Tetapkan ruang lingkup, dasar, dan konteks pengelolaan risiko organisasi."
  onBack={() => router.push("/management/charters")}
  backLabel="Kembali ke Piagam"
  badges={
    <CollectionStatusBadge
      tone={charterStatusTone[currentStatus] ?? "neutral"}
    >
      {charterStatusLabel[currentStatus] ?? currentStatus}
    </CollectionStatusBadge>
  }
  actions={
    <LoadingActionButton
      type="button"
      variant="primary"
      size="primary"
      loading={saving}
      loadingLabel={isCreateMode ? "Menyimpan piagam..." : "Memperbarui piagam..."}
      onClick={form.handleSubmit(onSubmit)}
    >
      <Save className="size-4" />
      {isCreateMode ? "Simpan Piagam" : "Perbarui Piagam"}
    </LoadingActionButton>
  }
/>
```

Start the form body with the identity section. This is one shared card surface
with a borderless responsive metadata grid:

```tsx
<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
  <FormSection
    title="Identitas Piagam"
    description="Identitas mengikuti organisasi aktif dan periode penilaian yang berlaku."
    contentClassName="space-y-4"
  >
    <div className="grid gap-5 md:grid-cols-3">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium text-foreground">Organisasi</p>
        <p className="break-words text-sm text-muted-foreground">
          {currentOrganization?.name ?? user?.orgName ?? "Belum tersedia"}
        </p>
        {!watched.organizationId ? (
          <p className="text-xs leading-5 text-destructive" role="alert">
            Organisasi aktif belum tersedia pada akun ini.
          </p>
        ) : null}
        {formState.errors.organizationId ? (
          <p className="text-xs leading-5 text-destructive" role="alert">
            {formState.errors.organizationId.message}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium text-foreground">Level UPR</p>
        <p className="text-sm text-muted-foreground">
          {uprLevelLabel[watched.uprLevel] ?? watched.uprLevel}
        </p>
      </div>
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium text-foreground">Periode</p>
        <p className="font-mono text-sm text-muted-foreground tabular-nums">
          {watched.period || currentAssessmentCycle()}
        </p>
      </div>
    </div>
  </FormSection>
```

Retain the UPR and period validation messages immediately below their values,
using the same `text-xs leading-5 text-destructive` and `role="alert"` pattern.

- [ ] **Step 8: Render the five narrative fields from the typed section data**

After the identity section, add:

```tsx
  {narrativeSections.map((section) => {
    const fieldId = `charter-${section.field}`;

    return (
      <FormSection
        key={section.field}
        title={section.title}
        description={section.description}
        contentClassName="space-y-2"
      >
        <Label htmlFor={fieldId} className="font-normal">
          {section.title}
        </Label>
        <Textarea
          id={fieldId}
          {...form.register(section.field)}
          placeholder={section.placeholder}
          className="min-h-40 resize-y"
        />
      </FormSection>
    );
  })}
</form>
```

Delete the old `sections.map` block, nested identity cards, separator markup,
completion circles, repeated textarea branches, and `form.setValue` handlers.

- [ ] **Step 9: Run the focused test and lint**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node 'src/app/(app)/management/charters/[id]/page.test.ts'
npm run lint -- 'src/app/(app)/management/charters/[id]/page.tsx' 'src/app/(app)/management/charters/[id]/page.test.ts' 'src/components/shared/design-system/index.ts'
```

Expected: the three tests PASS and ESLint reports no new warnings or errors in
the touched files.

- [ ] **Step 10: Commit the form refactor**

```bash
git add 'frontend/src/app/(app)/management/charters/[id]/page.tsx' \
  'frontend/src/app/(app)/management/charters/[id]/page.test.ts' \
  frontend/src/components/shared/design-system/index.ts
git commit -m "refactor: align risk charter form with design system"
```

### Task 3: Synchronize the catalogue and DESIGN.md

**Files:**
- Modify: `frontend/src/app/(app)/management/charters/[id]/page.test.ts`
- Modify: `frontend/src/app/(app)/design-system/page.tsx`
- Modify: `DESIGN.md`

- [ ] **Step 1: Add a failing documentation synchronization test**

Append to `frontend/src/app/(app)/management/charters/[id]/page.test.ts`:

```ts
const designSystemPage = readSource("../../../design-system/page.tsx");
const designSystemDocument = readSource("../../../../../../../DESIGN.md");

test("risk charter form rules stay synchronized with the design system", () => {
  assert.match(designSystemPage, /Form Piagam Manris/);
  assert.match(designSystemPage, /satu kolom/);
  assert.match(designSystemPage, /FormSection/);
  assert.match(designSystemDocument, /\*\*Piagam Manris form:\*\*/);
  assert.match(designSystemDocument, /single-column/);
  assert.match(designSystemDocument, /borderless metadata/);
});
```

- [ ] **Step 2: Run the test and confirm the documentation contract fails**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node 'src/app/(app)/management/charters/[id]/page.test.ts'
```

Expected: the form tests PASS and the new documentation test FAILS because the
catalogue and `DESIGN.md` do not yet contain the form-specific rule.

- [ ] **Step 3: Document the form in the design-system catalogue**

In the `Form Page Container` section of
`frontend/src/app/(app)/design-system/page.tsx`, add this paragraph before
`<FormContainerExample />`:

```tsx
<p className="max-w-3xl text-sm text-muted-foreground">
  Form Piagam Manris memakai FormPage satu kolom dengan lebar maksimum 5xl.
  Identitas tampil sebagai borderless metadata di dalam satu FormSection,
  sedangkan ruang lingkup, dasar hukum, konteks internal, konteks eksternal,
  dan stakeholder memakai FormSection terpisah yang selalu terbuka. Status,
  loading, error, label, textarea, dan aksi simpan menggunakan primitive shared;
  jangan memakai nested card atau indikator kelengkapan dekoratif.
</p>
```

- [ ] **Step 4: Add the canonical rule to DESIGN.md**

Add this rule immediately after `Piagam Manris collection`:

```markdown
- **Piagam Manris form:** Keep create and detail modes in the shared dynamic route and render the document as a `max-w-5xl` single-column `FormPage`. Use `FormHeader` with a concise subtitle, `CollectionStatusBadge`, and `LoadingActionButton`; remove decorative governance badges and route-local status colors. Keep `Identitas Piagam` as one `FormSection` containing a responsive three-column borderless metadata list for organization, UPR level, and period. Render Ruang Lingkup, Dasar Hukum, Konteks Internal, Konteks Eksternal, and Ringkasan Stakeholder as separate always-open `FormSection` surfaces with shared `Label` and `Textarea` primitives. Do not use a sticky sidebar, accordion, nested cards, section-completion ornaments, or duplicated helper copy. Loading and recoverable load failures use shared state primitives while the field schema, API payload, and unsaved-change guard remain unchanged.
```

- [ ] **Step 5: Run the documentation contract and diff check**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node 'src/app/(app)/management/charters/[id]/page.test.ts'
cd ..
git diff --check -- DESIGN.md 'frontend/src/app/(app)/design-system/page.tsx' 'frontend/src/app/(app)/management/charters/[id]/page.test.ts'
```

Expected: all four focused tests PASS and `git diff --check` exits with code 0.

- [ ] **Step 6: Commit the synchronized design documentation**

```bash
git add DESIGN.md \
  'frontend/src/app/(app)/design-system/page.tsx' \
  'frontend/src/app/(app)/management/charters/[id]/page.test.ts'
git commit -m "docs: document risk charter form pattern"
```

### Task 4: Verify the completed redesign

**Files:**
- Verify: `frontend/src/app/(app)/management/charters/[id]/page.tsx`
- Verify: `frontend/src/app/(app)/management/charters/[id]/page.test.ts`
- Verify: `frontend/src/components/shared/design-system/index.ts`
- Verify: `frontend/src/app/(app)/design-system/page.tsx`
- Verify: `DESIGN.md`

- [ ] **Step 1: Run focused tests**

```bash
cd frontend
node --test --experimental-specifier-resolution=node \
  'src/app/(app)/management/charters/[id]/page.test.ts' \
  'src/app/(app)/management/charters/page.test.ts'
```

Expected: every Risk Charter collection and form test passes with zero failures.

- [ ] **Step 2: Run lint on every touched TypeScript file**

```bash
npm run lint -- \
  'src/app/(app)/management/charters/[id]/page.tsx' \
  'src/app/(app)/management/charters/[id]/page.test.ts' \
  'src/app/(app)/design-system/page.tsx' \
  'src/components/shared/design-system/index.ts'
```

Expected: exit code 0 with no new errors or warnings from the touched files.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: exit code 0. If the known unrelated missing `placeholder` prop in
`src/app/(app)/reports/page.tsx` still blocks the build, record that exact
pre-existing blocker and do not change Reports as part of this plan.

- [ ] **Step 4: Inspect the final diff**

```bash
cd ..
git diff --check
git status --short
git diff --stat HEAD~3..HEAD
```

Expected: no whitespace errors; only the planned Risk Charter, design-system
barrel, catalogue, documentation, and test files appear in the three plan
commits. Existing unrelated working-tree changes remain intact.

- [ ] **Step 5: Perform a browser smoke check**

With the existing local frontend and backend running, visit:

```text
http://localhost:3000/management/charters/new
```

Confirm at desktop width:

- one full-width column with six sections in the approved order;
- no sidebar, nested identity cards, or decorative completion circles;
- organization, UPR, and period align as borderless metadata;
- the status badge and save loading state match other Manris forms.

Confirm at a narrow viewport:

- identity metadata stacks into one column;
- header actions wrap without overlap;
- textareas remain within the viewport.

- [ ] **Step 6: Report completion without creating an extra commit**

Summarize the redesign, test/lint/build evidence, any unrelated build blocker,
and confirm that both `DESIGN.md` and the design-system catalogue were updated.
