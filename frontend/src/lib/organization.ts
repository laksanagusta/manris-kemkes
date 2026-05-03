import { ApiError } from "@/lib/api";

export interface Organization {
  id: string;
  name: string;
  parentId?: string;
  uprLevel?: string; // "kementerian" | "upr_t1" | "upr_t2"
  createdAt: string;
}

export interface OrganizationPayloadInput {
  name: string;
  parentId: string | "__ROOT__";
  uprLevel?: string;
}

export interface OrganizationTreeNode extends Organization {
  children: OrganizationTreeNode[];
}

export interface VisibleOrganizationTreeNode extends OrganizationTreeNode {
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export interface OrganizationParentOption {
  id: string;
  name: string;
  parentId?: string;
  uprLevel?: string;
  createdAt: string;
}

export type OrganizationAction = "create" | "update" | "delete";

function createOrganizationNode(org: Organization): OrganizationTreeNode {
  return {
    ...org,
    children: [],
  };
}

export function buildOrganizationTree(
  organizations: Organization[],
): OrganizationTreeNode[] {
  const nodeMap = new Map<string, OrganizationTreeNode>();

  for (const organization of organizations) {
    nodeMap.set(organization.id, createOrganizationNode(organization));
  }

  const roots: OrganizationTreeNode[] = [];

  for (const organization of organizations) {
    const node = nodeMap.get(organization.id);
    if (!node) continue;

    const parentId = organization.parentId;
    const parentNode = parentId ? nodeMap.get(parentId) : undefined;

    if (parentNode) {
      parentNode.children.push(node);
      continue;
    }

    roots.push(node);
  }

  return roots;
}

export function flattenVisibleOrganizationTree(
  nodes: OrganizationTreeNode[],
  collapsedIds: ReadonlySet<string>,
  level = 0,
): VisibleOrganizationTreeNode[] {
  const result: VisibleOrganizationTreeNode[] = [];

  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren ? !collapsedIds.has(node.id) : false;

    result.push({
      ...node,
      level,
      hasChildren,
      isExpanded,
    });

    if (hasChildren && isExpanded) {
      result.push(...flattenVisibleOrganizationTree(node.children, collapsedIds, level + 1));
    }
  }

  return result;
}

export function getBlockedParentIds(
  organizations: Organization[],
  currentOrgId: string,
): Set<string> {
  const blocked = new Set<string>();
  if (!currentOrgId) return blocked;

  const childrenMap = new Map<string, string[]>();

  for (const organization of organizations) {
    if (!organization.parentId) continue;

    const children = childrenMap.get(organization.parentId) ?? [];
    children.push(organization.id);
    childrenMap.set(organization.parentId, children);
  }

  const stack = [currentOrgId];

  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || blocked.has(id)) continue;

    blocked.add(id);

    const children = childrenMap.get(id);
    if (children) stack.push(...children);
  }

  return blocked;
}

export function filterToAccessibleOrgs(orgs: Organization[], accessibleOrgIds: string[]): Organization[] {
  return orgs.filter(org => accessibleOrgIds.includes(org.id));
}

export function getAvailableParentOptions(
  organizations: Organization[],
  currentOrgId: string,
): OrganizationParentOption[] {
  const blockedIds = getBlockedParentIds(organizations, currentOrgId);

  return organizations.filter((organization) => !blockedIds.has(organization.id));
}

export function toOrganizationRequestBody({
  name,
  parentId,
  uprLevel,
}: OrganizationPayloadInput): { name: string; parentId: string | null; uprLevel: string } {
  return {
    name,
    parentId:
      parentId === "__ROOT__" || parentId.trim() === "" ? null : parentId,
    uprLevel: uprLevel ?? "",
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const typedError = error as { message?: string; error?: string };
    return typedError.message || typedError.error || "";
  }

  return typeof error === "string" ? error : "";
}

function isDeleteConstraintError(message: string): boolean {
  return /sub-?unit|sub unit|child|children|memiliki sub-unit/i.test(message);
}

function isDeleteReferenceError(message: string): boolean {
  return /dipakai di data lain|referenced|foreign key|constraint|masih digunakan|used in/i.test(
    message,
  );
}

function isInvalidParentError(message: string): boolean {
  return /parent.*tidak valid|invalid parent|cycle|siklus|dirinya sendiri|turunannya|descendant|self/i.test(
    message,
  );
}

export function getOrganizationActionErrorMessage(
  action: OrganizationAction,
  error: unknown,
): string {
  const message = getErrorMessage(error);

  if (action === "delete") {
    if (isDeleteConstraintError(message)) {
      return "Organisasi ini tidak bisa dihapus karena masih memiliki sub-unit.";
    }

    if (isDeleteReferenceError(message)) {
      return "Organisasi ini tidak bisa dihapus karena masih dipakai di data lain.";
    }

    return "Gagal menghapus organisasi.";
  }

  if (action === "update" || action === "create") {
    if (isInvalidParentError(message)) {
      return "Parent unit tidak valid. Pilih unit lain yang bukan dirinya sendiri atau turunannya.";
    }

    return "Gagal menyimpan organisasi.";
  }

  if (isInvalidParentError(message)) {
    return "Parent unit tidak valid. Pilih unit lain yang bukan dirinya sendiri atau turunannya.";
  }

  return "Terjadi kesalahan saat memproses organisasi.";
}
