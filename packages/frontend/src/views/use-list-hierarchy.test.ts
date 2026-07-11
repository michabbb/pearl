import type { Dependency, IssueListItem } from "@pearl/shared";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useListHierarchy } from "./use-list-hierarchy";

function makeIssue(id: string, status: IssueListItem["status"] = "open"): IssueListItem {
  return {
    id,
    title: id,
    status,
    priority: 2,
    issue_type: "task",
    assignee: null,
    owner: "micha",
    created_at: "2026-07-11T10:00:00Z",
    updated_at: "2026-07-11T10:00:00Z",
    due_at: null,
    pinned: false,
    has_attachments: false,
    labels: [],
    labelColors: {},
  };
}

function contains(parentId: string, childId: string): Dependency {
  return {
    issue_id: parentId,
    depends_on_id: childId,
    type: "contains",
    created_at: "2026-07-11T10:00:00Z",
    created_by: "micha",
  };
}

describe("useListHierarchy", () => {
  it("flattens all issue types recursively while preserving sibling order", () => {
    const issues = [
      makeIssue("root"),
      makeIssue("sibling"),
      makeIssue("child-b"),
      makeIssue("child-a", "closed"),
      makeIssue("grandchild"),
    ];
    const dependencies = [
      contains("root", "child-a"),
      contains("root", "child-b"),
      contains("child-a", "grandchild"),
    ];

    const { result } = renderHook(() => useListHierarchy(issues, dependencies));

    expect(result.current.tableIssues.map((issue) => issue.id)).toEqual([
      "root",
      "child-b",
      "child-a",
      "grandchild",
      "sibling",
    ]);
    expect(result.current.hierarchyInfo.get("grandchild")?.depth).toBe(2);
    expect(result.current.issueProgress.get("root")).toEqual({ done: 1, total: 2 });
  });

  it("collapses a complete subtree", () => {
    const issues = [makeIssue("root"), makeIssue("child"), makeIssue("grandchild")];
    const dependencies = [contains("root", "child"), contains("child", "grandchild")];
    const { result } = renderHook(() => useListHierarchy(issues, dependencies));

    act(() => result.current.handleToggleExpand("root"));

    expect(result.current.tableIssues.map((issue) => issue.id)).toEqual(["root"]);
    expect(result.current.expandedIssueIds.has("root")).toBe(false);
  });

  it("shows only roots when top-level only is active", () => {
    const issues = [makeIssue("root"), makeIssue("child"), makeIssue("other-root")];
    const dependencies = [contains("root", "child")];
    const { result } = renderHook(() => useListHierarchy(issues, dependencies));

    act(() => result.current.setTopLevelOnly(true));

    expect(result.current.tableIssues.map((issue) => issue.id)).toEqual(["root", "other-root"]);
  });

  it("keeps cyclic issues visible without recursing forever", () => {
    const issues = [makeIssue("first"), makeIssue("second")];
    const dependencies = [contains("first", "second"), contains("second", "first")];

    const { result } = renderHook(() => useListHierarchy(issues, dependencies));

    expect(result.current.tableIssues.map((issue) => issue.id)).toEqual(["first", "second"]);
  });
});
