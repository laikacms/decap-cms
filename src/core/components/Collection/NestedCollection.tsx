import React from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import sortBy from 'lodash/sortBy';

import { NavLink } from '../../routing/Link';
import { dirname } from '../../../lib-util/index';
import { stringTemplate } from '../../../lib-widgets/index';
import { Icon, colors, components } from '../../../ui-default/index';
import { selectEntries } from '../../reducers/entries';
import { selectEntryCollectionTitle } from '../../reducers/collections';
import { useAppSelector } from '../../hooks/useRedux';

import type { CmsCollectionState, CmsEntry } from '../../../lib-util/index';

const sep = '/';

const { addFileTemplateFields } = stringTemplate;

const NodeTitleContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const NodeTitle = styled.div`
  margin-right: 4px;
`;

const Caret = styled.div`
  position: relative;
  top: 2px;
`;

const CaretDown = styled(Caret)`
  ${components.caretDown};
  color: currentColor;
`;

const CaretRight = styled(Caret)`
  ${components.caretRight};
  color: currentColor;
  left: 2px;
`;

const TreeNavLink = styled(NavLink, {
  shouldForwardProp: prop => prop !== '$depth',
})<{ $depth: number }>`
  display: flex;
  font-size: 14px;
  font-weight: 500;
  align-items: center;
  padding: 8px;
  padding-left: ${(props: { $depth: number }) => props.$depth * 16 + 18}px;
  border-left: 2px solid #fff;

  ${Icon} {
    margin-right: 4px;
    flex-shrink: 0;
  }

  ${() => css`
    &:hover,
    &:active,
    &.active {
      color: ${colors.active};
      background-color: ${colors.activeBackground};
      border-left-color: #4863c6;
    }
  `};
`;

function getNodeTitle(node: TreeNodeData): string {
  const title = node.isRoot
    ? node.title
    : node.children.find((c: TreeNodeData) => !c.isDir && c.title)?.title || node.title;
  return title;
}

interface TreeNodeData {
  title: string;
  path: string;
  isDir: boolean;
  isRoot: boolean;
  children: TreeNodeData[];
  expanded?: boolean;
}

interface TreeNodeProps {
  collection: CmsCollectionState;
  depth?: number;
  treeData: TreeNodeData[];
  onToggle: (args: { node: TreeNodeData; expanded: boolean }) => void;
}

function TreeNode(props: TreeNodeProps): React.ReactNode {
  const { collection, treeData, depth = 0, onToggle } = props;
  const collectionName = collection.name;

  const sortedData = sortBy(treeData, getNodeTitle);
  const subfolders = collection.nested?.subfolders !== false;
  return sortedData.map(node => {
    const leaf =
      depth > 0 &&
      (subfolders
        ? node.children.length <= 1 && !node.children[0]?.isDir
        : node.children.length === 0);
    if (leaf) {
      return null;
    }
    let to = `/collections/${collectionName}`;
    if (depth > 0) {
      to = `${to}/filter${node.path}`;
    }
    const title = getNodeTitle(node);

    const hasChildren =
      depth === 0 ||
      (subfolders
        ? node.children.some(c => c.children.some(c => c.isDir))
        : node.children.some(c => c.isDir));

    return (
      <React.Fragment key={node.path}>
        <TreeNavLink
          end
          to={to}
          onClick={() => onToggle({ node, expanded: !node.expanded })}
          $depth={depth}
          data-testid={node.path}
        >
          <Icon type="write" />
          <NodeTitleContainer>
            <NodeTitle>{title}</NodeTitle>
            {hasChildren && (node.expanded ? <CaretDown /> : <CaretRight />)}
          </NodeTitleContainer>
        </TreeNavLink>
        {node.expanded && (
          <TreeNode
            collection={collection}
            depth={depth + 1}
            treeData={node.children}
            onToggle={onToggle}
          />
        )}
      </React.Fragment>
    );
  });
}

export function walk(treeData: TreeNodeData[], callback: (node: TreeNodeData) => void): void {
  function traverse(children: TreeNodeData[]) {
    for (const child of children) {
      callback(child);
      traverse(child.children);
    }
  }

  return traverse(treeData);
}

interface FlatNode {
  title: string;
  path: string;
  isDir: boolean;
  isRoot: boolean;
  [key: string]: unknown;
}

export function getTreeData(collection: CmsCollectionState, entries: CmsEntry[]): TreeNodeData[] {
  const collectionFolder = collection.folder as string;
  const rootFolder = '/';
  const entriesObj = entries.map((e: CmsEntry) => ({
    ...e,
    path: e.path.slice(collectionFolder.length),
  }));

  const dirs = entriesObj.reduce(
    (acc: Record<string, string | undefined>, entry: Record<string, unknown>) => {
      let dir = dirname(entry.path as string);
      while (!acc[dir] && dir && dir !== rootFolder) {
        const parts = dir.split(sep);
        acc[dir] = parts.pop();
        dir = parts.length ? parts.join(sep) : '';
      }
      return acc;
    },
    {} as Record<string, string | undefined>,
  );

  let col = { ...collection };
  if (col.nested && (col as any).nested?.summary) {
    col = { ...col, summary: (col as any).nested.summary };
  } else {
    const { summary: _summary, ...rest } = col;
    col = rest as CmsCollectionState;
  }

  const flatData: FlatNode[] = [
    {
      title: col.label as string,
      path: rootFolder,
      isDir: true,
      isRoot: true,
    },
    ...Object.entries(dirs).map(([key, value]) => ({
      title: value as string,
      path: key,
      isDir: true,
      isRoot: false,
    })),
    ...entriesObj.map((e: Record<string, unknown>, index: number) => {
      let entryMap = { ...entries[index] };
      entryMap = {
        ...entryMap,
        data: addFileTemplateFields(entryMap.path as string, entryMap.data as any),
      };
      const title = selectEntryCollectionTitle(col, entryMap as any);
      return {
        ...e,
        title,
        isDir: false,
        isRoot: false,
      } as FlatNode;
    }),
  ];

  const parentsToChildren = flatData.reduce(
    (acc: Record<string, FlatNode[]>, node: FlatNode) => {
      const parent = node.path === rootFolder ? '' : dirname(node.path);
      if (acc[parent]) {
        acc[parent].push(node);
      } else {
        acc[parent] = [node];
      }
      return acc;
    },
    {} as Record<string, FlatNode[]>,
  );

  function reducer(acc: TreeNodeData[], value: FlatNode): TreeNodeData[] {
    const node = value;
    let children: TreeNodeData[] = [];
    if (parentsToChildren[node.path]) {
      children = parentsToChildren[node.path].reduce(reducer, []);
    }

    acc.push({ ...node, children });
    return acc;
  }

  const treeData: TreeNodeData[] = parentsToChildren[''].reduce(reducer, []);

  return treeData;
}

export function updateNode(
  treeData: TreeNodeData[],
  node: TreeNodeData,
  callback: (node: TreeNodeData) => TreeNodeData,
): TreeNodeData[] {
  let stop = false;

  function updater(nodes: TreeNodeData[]): TreeNodeData[] {
    if (stop) {
      return nodes;
    }
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].path === node.path) {
        nodes[i] = callback(node);
        stop = true;
        return nodes;
      }
    }
    nodes.forEach(node => updater(node.children));
    return nodes;
  }

  return updater([...treeData]);
}

interface NestedCollectionProps {
  collection: CmsCollectionState;
  entries: CmsEntry[];
  filterTerm?: string;
}

function shallowArrayEqual(a: unknown[], b: unknown[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export default function ConnectedNestedCollection({
  collection,
  filterTerm,
}: {
  collection: CmsCollectionState;
  filterTerm?: string;
}) {
  const entries = useAppSelector(
    (state: any) => (selectEntries(state.entries, collection) || []) as CmsEntry[],
    shallowArrayEqual,
  );
  return <NestedCollection collection={collection} entries={entries} filterTerm={filterTerm} />;
}

export function NestedCollection({ collection, entries, filterTerm }: NestedCollectionProps) {
  // Mirror legacy behavior: when the tree is first built with non-empty
  // entries, expand any node whose path is a prefix of the current filter
  // URL (so '/' always matches the root, expanding it; '/dir' expands the
  // /dir node, etc.). When entries are still loading we skip this and the
  // componentDidUpdate-equivalent branch below picks it up.
  const [treeData, setTreeData] = React.useState<TreeNodeData[]>(() => {
    const initial = getTreeData(collection, entries);
    // Only auto-expand when there is an actual filter path to expand toward.
    // Without this guard `'/'.startsWith('/')` always matches, so the root would
    // expand on mount and a click meant to expand it would instead collapse it.
    if (entries && entries.length > 0 && filterTerm) {
      const path = `/${filterTerm}`;
      walk(initial, (node: TreeNodeData) => {
        if (path.startsWith(node.path)) {
          node.expanded = true;
        }
      });
    }
    return initial;
  });
  const [selected, setSelected] = React.useState<TreeNodeData | null>(null);
  const [useFilter, setUseFilter] = React.useState(true);

  // Track previous values so we only rebuild when one of the inputs changes,
  // matching the original componentDidUpdate semantics (preserve current
  // expansion state, then re-apply based on the new entries/filter).
  const isFirstRender = React.useRef(true);
  const prevInputs = React.useRef({ collection, entries, filterTerm });

  if (isFirstRender.current) {
    isFirstRender.current = false;
  } else if (
    prevInputs.current.collection !== collection ||
    prevInputs.current.entries !== entries ||
    prevInputs.current.filterTerm !== filterTerm
  ) {
    // When the filter URL changes, treat it as a fresh navigation: expand to
    // the new path even if the user previously collapsed something.
    const filterChanged = prevInputs.current.filterTerm !== filterTerm;
    const applyFilterExpansion = useFilter || filterChanged;

    const expanded: Record<string, boolean> = {};
    walk(treeData, (node: TreeNodeData) => {
      if (node.expanded) {
        expanded[node.path] = true;
      }
    });
    const nextTree = getTreeData(collection, entries);

    const path = `/${filterTerm ?? ''}`;
    walk(nextTree, (node: TreeNodeData) => {
      if (
        expanded[node.path] ||
        (applyFilterExpansion && filterTerm && path.startsWith(node.path))
      ) {
        node.expanded = true;
      }
    });
    prevInputs.current = { collection, entries, filterTerm };
    if (filterChanged && filterTerm) {
      setUseFilter(true);
    }
    // setState during render to derive new tree before commit, like the
    // original componentDidUpdate did synchronously after render.
    setTreeData(nextTree);
  }

  function onToggle({ node, expanded }: { node: TreeNodeData; expanded: boolean }) {
    if (!selected || selected.path === node.path || expanded) {
      const nextTree = updateNode(treeData, node, (n: TreeNodeData) => ({ ...n, expanded }));
      setTreeData(nextTree);
      setSelected(node);
      setUseFilter(false);
    } else {
      // don't collapse non selected nodes when clicked
      setSelected(node);
      setUseFilter(false);
    }
  }

  return <TreeNode collection={collection} treeData={treeData} onToggle={onToggle} />;
}
