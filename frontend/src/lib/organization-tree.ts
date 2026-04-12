export type OrganizationTreeLike = {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  children: OrganizationTreeLike[];
};

export type VisibleOrganizationTreeLike = OrganizationTreeLike & {
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
};

export function flattenVisibleOrganizationTree(
  nodes: OrganizationTreeLike[],
  collapsedIds: ReadonlySet<string>,
  level = 0,
): VisibleOrganizationTreeLike[] {
  const result: VisibleOrganizationTreeLike[] = [];

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
