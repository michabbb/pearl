import type { Dependency, IssueListItem } from "@pearl/shared";
import { useCallback, useMemo, useState } from "react";
import type { HierarchyInfo, IssueProgress } from "@/components/issue-table/columns";

interface IssueHierarchy {
  childIdsByParentId: Map<string, string[]>;
  parentIdByChildId: Map<string, string>;
  rootIssueIds: string[];
}

function buildIssueHierarchy(issues: IssueListItem[], dependencies: Dependency[]): IssueHierarchy {
  const issueIds = new Set(issues.map((issue) => issue.id));
  const issueOrder = new Map(issues.map((issue, index) => [issue.id, index]));
  const childIdsByParentId = new Map<string, string[]>();
  const parentIdByChildId = new Map<string, string>();

  for (const dependency of dependencies) {
    const parentId = dependency.issue_id;
    const childId = dependency.depends_on_id;

    if (
      dependency.type !== "contains" ||
      parentId === childId ||
      !issueIds.has(parentId) ||
      !issueIds.has(childId) ||
      parentIdByChildId.has(childId)
    ) {
      continue;
    }

    parentIdByChildId.set(childId, parentId);
    const childIds = childIdsByParentId.get(parentId) ?? [];
    childIds.push(childId);
    childIdsByParentId.set(parentId, childIds);
  }

  for (const childIds of childIdsByParentId.values()) {
    childIds.sort(
      (firstId, secondId) =>
        (issueOrder.get(firstId) ?? Number.MAX_SAFE_INTEGER) -
        (issueOrder.get(secondId) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return {
    childIdsByParentId,
    parentIdByChildId,
    rootIssueIds: issues
      .filter((issue) => !parentIdByChildId.has(issue.id))
      .map((issue) => issue.id),
  };
}

export function useListHierarchy(issues: IssueListItem[], dependencies: Dependency[]) {
  const hierarchy = useMemo(
    () => buildIssueHierarchy(issues, dependencies),
    [issues, dependencies],
  );
  const issueById = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues]);

  const issueProgress = useMemo(() => {
    const progressByIssueId = new Map<string, IssueProgress>();

    for (const [parentId, childIds] of hierarchy.childIdsByParentId) {
      progressByIssueId.set(parentId, {
        done: childIds.filter((childId) => issueById.get(childId)?.status === "closed").length,
        total: childIds.length,
      });
    }

    return progressByIssueId;
  }, [hierarchy.childIdsByParentId, issueById]);

  const [topLevelOnly, setTopLevelOnly] = useState(false);
  const [collapsedIssueIds, setCollapsedIssueIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((issueId: string) => {
    setCollapsedIssueIds((previousIds) => {
      const nextIds = new Set(previousIds);
      if (nextIds.has(issueId)) nextIds.delete(issueId);
      else nextIds.add(issueId);
      return nextIds;
    });
  }, []);

  const { hierarchyInfo, tableIssues } = useMemo(() => {
    const flattenedIssues: IssueListItem[] = [];
    const infoByIssueId = new Map<string, HierarchyInfo>();
    const visitedIssueIds = new Set<string>();

    function appendIssue(issueId: string, depth: number) {
      if (visitedIssueIds.has(issueId)) return;

      const issue = issueById.get(issueId);
      if (!issue) return;

      visitedIssueIds.add(issueId);
      const childIds = hierarchy.childIdsByParentId.get(issueId) ?? [];
      infoByIssueId.set(issueId, { depth, hasChildren: childIds.length > 0 });
      flattenedIssues.push(issue);

      if (topLevelOnly || collapsedIssueIds.has(issueId)) return;
      for (const childId of childIds) appendIssue(childId, depth + 1);
    }

    for (const rootIssueId of hierarchy.rootIssueIds) appendIssue(rootIssueId, 0);

    function belongsToRootlessCycle(issueId: string) {
      const ancestorIds = new Set<string>();
      let currentId: string | undefined = issueId;

      while (currentId) {
        if (ancestorIds.has(currentId)) return true;
        ancestorIds.add(currentId);
        currentId = hierarchy.parentIdByChildId.get(currentId);
      }

      return false;
    }

    // Malformed cyclic relationships have no root. Keep those issues visible once
    // instead of allowing bad dependency data to hide the entire cycle.
    if (!topLevelOnly) {
      for (const issue of issues) {
        if (belongsToRootlessCycle(issue.id)) appendIssue(issue.id, 0);
      }
    }

    return { hierarchyInfo: infoByIssueId, tableIssues: flattenedIssues };
  }, [collapsedIssueIds, hierarchy, issueById, issues, topLevelOnly]);

  const expandedIssueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const issueId of hierarchy.childIdsByParentId.keys()) {
      if (!collapsedIssueIds.has(issueId)) ids.add(issueId);
    }
    return ids;
  }, [collapsedIssueIds, hierarchy.childIdsByParentId]);

  return {
    issueProgress,
    hierarchyInfo,
    topLevelOnly,
    setTopLevelOnly,
    expandedIssueIds,
    handleToggleExpand,
    tableIssues,
  };
}
