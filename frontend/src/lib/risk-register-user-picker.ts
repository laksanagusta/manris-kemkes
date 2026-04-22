export type UserPickerOption = {
  id: string;
  name: string;
  role?: string;
  subtitle?: string;
  email?: string;
  username?: string;
  nip?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
  orgName?: string | null;
};

export function appendUniqueUserOptions(
  current: UserPickerOption[],
  nextPage: UserPickerOption[],
): UserPickerOption[] {
  const nextOptions = [...current];
  const seenIds = new Set(current.map((option) => option.id));

  nextPage.forEach((option) => {
    if (seenIds.has(option.id)) {
      return;
    }

    seenIds.add(option.id);
    nextOptions.push(option);
  });

  return nextOptions;
}

export function mergeRemoteUserPickerOptions(params: {
  current: UserPickerOption[];
  nextPage: UserPickerOption[];
  page: number;
  selected: UserPickerOption | null;
}): UserPickerOption[] {
  const baseOptions =
    params.page === 1
      ? params.selected
        ? [params.selected]
        : []
      : params.current;

  return appendUniqueUserOptions(baseOptions, params.nextPage);
}

export function getNextUserPickerActiveIndex(params: {
  currentIndex: number;
  total: number;
  direction: 1 | -1;
}): number {
  if (params.total <= 0) {
    return -1;
  }

  if (params.currentIndex < 0) {
    return params.direction === 1 ? 0 : params.total - 1;
  }

  const nextIndex = params.currentIndex + params.direction;

  if (nextIndex < 0) {
    return 0;
  }

  if (nextIndex >= params.total) {
    return params.total - 1;
  }

  return nextIndex;
}

export function filterApproverOptions(
  options: UserPickerOption[],
  params: { reviewerId?: string; selectedApproverIds?: string[] },
): UserPickerOption[] {
  const selectedApproverIds = new Set(params.selectedApproverIds ?? []);

  return options.filter((option) => {
    if (option.role === "reviewer") {
      return false;
    }

    if (params.reviewerId && option.id === params.reviewerId) {
      return false;
    }

    return !selectedApproverIds.has(option.id);
  });
}
