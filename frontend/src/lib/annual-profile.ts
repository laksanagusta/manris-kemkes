import type {
  AnnualCandidate,
  AnnualMember,
  AnnualProfile,
  AnnualProfileListVersion,
} from "./api/upr-workflow";
import type { MonitoringRule } from "./api/monitoring-rules";

export const annualProfileListHref = "/risk/annual-profiles";

export function annualProfileHref(year: number, version?: string) {
  return `${annualProfileListHref}/${year}${version ? `?versi=${encodeURIComponent(version)}` : ""}`;
}

export function isAnnualProfileYear(year: number) {
  return Number.isInteger(year) && year >= 1900 && year <= 9998;
}

export function getAnnualProfileRuleSelection(
  rules: MonitoringRule[],
  defaultYear: number,
  selectedId: string,
) {
  const availableRules = rules.filter(
    (rule) => rule.active && isAnnualProfileYear(rule.year),
  );
  const selectedRule =
    availableRules.find((rule) => rule.id === selectedId) ??
    availableRules.find((rule) => rule.year === defaultYear) ??
    availableRules[0];

  return { availableRules, selectedRule };
}

export function groupAnnualProfiles(versions: AnnualProfileListVersion[]) {
  const groups = new Map<string, AnnualProfileListVersion[]>();
  for (const version of versions) {
    const key = `${version.organizationId ?? ""}:${version.year}`;
    const group = groups.get(key) ?? [];
    group.push(version);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort(([a], [b]) => b.year - a.year || (a.organizationName ?? "").localeCompare(b.organizationName ?? "", "id"))
    .map((versions) => {
      versions.sort((a, b) => b.version - a.version);
      const draft = versions.find((version) => !version.finalizedAt);
      const final = versions.find((version) => version.finalizedAt);
      const updatedAt = versions.reduce(
        (latest, item) =>
          Date.parse(item.updatedAt) > Date.parse(latest)
            ? item.updatedAt
            : latest,
        versions[0].updatedAt,
      );
      return { year: versions[0].year, draft, final, updatedAt };
    });
}

export function annualMemberReadiness(
  member: AnnualMember,
  objectives: AnnualProfile["objectives"],
) {
  if (member.baseline) {
    return {
      ready: true,
      assessment: true,
      objective: Boolean(member.baseline.objective),
      label: "Final",
      tone: "success",
    };
  }
  const objective = objectives.some((item) => item.id === member.objectiveId);
  if (!member.riskId) {
    return {
      ready: false,
      assessment: false,
      objective,
      label: "Belum dinilai",
      tone: "warning",
    };
  }
  const assessment = member.riskStatus === "final";
  return {
    ready: assessment,
    assessment,
    objective,
    label: assessment ? "Final" : "Draf",
    tone: assessment ? "success" : "info",
  };
}

export function annualProfileReadiness(profile: AnnualProfile) {
  const ready = profile.members.filter(
    (member) => annualMemberReadiness(member, profile.objectives).ready,
  ).length;
  return {
    ready,
    total: profile.members.length,
    canFinalize: profile.members.length > 0 && ready === profile.members.length,
  };
}

export function annualCandidateSource(
  candidate: AnnualCandidate,
  year: number,
) {
  switch (candidate.source) {
    case "prior_profile":
      return `Profil final ${year - 1}`;
    case "year_end_register":
      return `Register per 31 Desember ${year - 1}`;
    case "current_year":
      return `Register ${year}`;
    default:
      return "Register aktif lainnya";
  }
}

export function filterAnnualCandidates(
  candidates: AnnualCandidate[],
  members: AnnualMember[],
  year: number,
  source: "active" | "prior",
) {
  const groups = new Set(members.map((member) => member.groupId));
  return candidates.filter((candidate) => {
    const period = /^(\d{4})-Q[1-4]$/.exec(candidate.period);
    return (
      !groups.has(candidate.groupId) &&
      (!period || Number(period[1]) <= year) &&
      (source === "active" || candidate.source === "prior_profile")
    );
  });
}

export type AnnualBatchResult = { added: string[]; error?: string };

// Saves are individual transactions. Stop on the first failure and keep an exact
// checkpoint so a retry does not repeat already committed assessments.
export async function saveAnnualCandidateBatch(
  candidates: AnnualCandidate[],
  save: (candidate: AnnualCandidate) => Promise<unknown>,
): Promise<AnnualBatchResult> {
  const result: AnnualBatchResult = { added: [] };
  for (const candidate of candidates) {
    try {
      await save(candidate);
      result.added.push(candidate.id);
    } catch (cause) {
      result.error = `${candidate.code}: ${cause instanceof Error ? cause.message : "Permintaan gagal. Coba lagi."}`;
      break;
    }
  }
  return result;
}
