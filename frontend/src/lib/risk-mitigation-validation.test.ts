import assert from "node:assert/strict";
import test from "node:test";

const { getRiskMitigationRequirementError, getMitigationActionErrors } = await import(
  new URL("./risk-mitigation-validation.ts", import.meta.url).href
);

test("error seluruh daftar mitigasi tidak dianggap sebagai array", () => {
  assert.deepEqual(getMitigationActionErrors(undefined), []);
  assert.deepEqual(
    getMitigationActionErrors({ type: "manual", message: "Tambahkan rencana mitigasi baru" }),
    [],
  );
  assert.deepEqual(
    getMitigationActionErrors({ root: { message: "Tambahkan rencana mitigasi baru" } }),
    [],
  );
});

test("error aksi mitigasi tetap mengikuti indeks barisnya", () => {
  assert.deepEqual(
    getMitigationActionErrors([
      undefined,
      { action: { message: "Aksi mitigasi wajib diisi" } },
      { owner: { message: "PIC wajib dipilih" } },
    ]),
    [undefined, "Aksi mitigasi wajib diisi", undefined],
  );
});

test("risiko utama dengan mitigasi membutuhkan rencana baru yang terisi", () => {
  for (const mitigations of [
    [],
    [{ action: "   " }],
    [{ action: "Kontrol lama", isExistingControl: true }],
  ]) {
    assert.equal(
      getRiskMitigationRequirementError(10, "mitigate", mitigations),
      "Risiko utama dengan pilihan Mitigasi memerlukan minimal satu rencana mitigasi baru.",
    );
  }
});

test("rencana baru memenuhi persyaratan meskipun ada kontrol lama", () => {
  assert.equal(
    getRiskMitigationRequirementError(12, "mitigate", [
      { action: "Kontrol lama", isExistingControl: true },
      { action: "Rencana baru", isExistingControl: false },
    ]),
    undefined,
  );
});

test("risiko di bawah ambang utama atau pilihan selain mitigasi tidak diwajibkan", () => {
  assert.equal(getRiskMitigationRequirementError(9, "mitigate", []), undefined);
  for (const treatment of ["accept", "avoid", "transfer", undefined]) {
    assert.equal(getRiskMitigationRequirementError(10, treatment, []), undefined);
  }
});
