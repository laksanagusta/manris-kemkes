export type WorkingPaperSignatoryDraft = {
  user_id: string;
  signer_name: string;
  signer_jabatan: string;
  signer_pangkat: string;
  signer_nip?: string;
};

export function createEmptyWorkingPaperSignatory(): WorkingPaperSignatoryDraft {
  return {
    user_id: "",
    signer_name: "",
    signer_jabatan: "",
    signer_pangkat: "",
    signer_nip: "",
  };
}

export function moveWorkingPaperSignatories(
  signatories: WorkingPaperSignatoryDraft[],
  fromIndex: number,
  toIndex: number,
): WorkingPaperSignatoryDraft[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= signatories.length ||
    toIndex >= signatories.length
  ) {
    return [...signatories];
  }

  const nextSignatories = [...signatories];
  const [movedSignatory] = nextSignatories.splice(fromIndex, 1);

  nextSignatories.splice(toIndex, 0, movedSignatory);

  return nextSignatories;
}
