import assert from "node:assert/strict";
import test from "node:test";

const treeLib = await import(new URL("./organization-tree", import.meta.url).href);

type OrganizationTreeNode = {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  children: OrganizationTreeNode[];
};

const flattenVisibleOrganizationTree = (
  treeLib as {
    flattenVisibleOrganizationTree: (
      nodes: OrganizationTreeNode[],
      collapsedIds: ReadonlySet<string>,
      level?: number,
    ) => Array<OrganizationTreeNode & { level: number; hasChildren: boolean; isExpanded: boolean }>;
  }
).flattenVisibleOrganizationTree;

function makeNode(
  overrides: Partial<OrganizationTreeNode> & Pick<OrganizationTreeNode, "id" | "name">,
): OrganizationTreeNode {
  const { id, name, createdAt = "2026-04-01T00:00:00.000Z", parentId, children = [] } = overrides;

  return {
    id,
    name,
    createdAt,
    ...(parentId ? { parentId } : {}),
    children,
  };
}

test("flattenVisibleOrganizationTree keeps the full tree visible by default", () => {
  const tree: OrganizationTreeNode[] = [
    makeNode({
      id: "root",
      name: "Root",
      children: [
        makeNode({
          id: "child",
          name: "Child",
          parentId: "root",
          children: [makeNode({ id: "grandchild", name: "Grandchild", parentId: "child" })],
        }),
      ],
    }),
  ];

  const rows = flattenVisibleOrganizationTree(tree, new Set());

  assert.deepEqual(
    rows.map((row) => [row.id, row.level, row.isExpanded]),
    [
      ["root", 0, true],
      ["child", 1, true],
      ["grandchild", 2, false],
    ]
  );
});

test("flattenVisibleOrganizationTree hides descendants when a parent is collapsed", () => {
  const tree: OrganizationTreeNode[] = [
    makeNode({
      id: "root",
      name: "Root",
      children: [
        makeNode({
          id: "child",
          name: "Child",
          parentId: "root",
          children: [makeNode({ id: "grandchild", name: "Grandchild", parentId: "child" })],
        }),
      ],
    }),
  ];

  const rows = flattenVisibleOrganizationTree(tree, new Set(["child"]));

  assert.deepEqual(rows.map((row) => row.id), ["root", "child"]);
  assert.equal(rows[0].isExpanded, true);
  assert.equal(rows[1].isExpanded, false);
});
