import React from 'react';
import { List } from 'immutable';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { connect } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { dirname } from 'decap-cms-lib-util';
import { stringTemplate } from 'decap-cms-lib-widgets';
import { Icon, colors, components } from 'decap-cms-ui-default';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import sortBy from 'lodash/sortBy';

import { selectEntries } from '../../reducers/entries';
import { selectEntryCollectionTitle } from '../../reducers/collections';

import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';
import type { Collection, EntryMap, State, Entries } from '../../types/cms';

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

const TreeNavLink = styled(NavLink)<{ $depth: number }>`
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
    &.sidebar-active {
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
  collection: Collection;
  depth?: number;
  treeData: TreeNodeData[];
  onToggle: (args: { node: TreeNodeData; expanded: boolean }) => void;
}

function TreeNode(props: TreeNodeProps): React.ReactNode {
  const { collection, treeData, depth = 0, onToggle } = props;
  const collectionName = collection.get('name');

  const sortedData = sortBy(treeData, getNodeTitle);
  const subfolders = collection.get('nested')?.get('subfolders') !== false;
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
          className={({ isActive }: { isActive: boolean }) => (isActive ? 'sidebar-active' : '')}
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

TreeNode.propTypes = {
  collection: ImmutablePropTypes.map.isRequired,
  depth: PropTypes.number,
  treeData: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
};

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

export function getTreeData(collection: Collection, entries: ImmutableList<EntryMap>): TreeNodeData[] {
  const collectionFolder = collection.get('folder') as string;
  const rootFolder = '/';
  const entriesObj = entries
    .toJS()
    .map((e: Record<string, unknown>) => ({ ...e, path: (e.path as string).slice(collectionFolder.length) }));

  const dirs = entriesObj.reduce((acc: Record<string, string | undefined>, entry: Record<string, unknown>) => {
    let dir = dirname(entry.path as string);
    while (!acc[dir] && dir && dir !== rootFolder) {
      const parts = dir.split(sep);
      acc[dir] = parts.pop();
      dir = parts.length ? parts.join(sep) : '';
    }
    return acc;
  }, {} as Record<string, string | undefined>);

  let col = collection;
  if (col.getIn(['nested', 'summary'])) {
    col = col.set('summary', col.getIn(['nested', 'summary']) as string) as Collection;
  } else {
    col = col.delete('summary') as Collection;
  }

  const flatData: FlatNode[] = [
    {
      title: col.get('label') as string,
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
      let entryMap = entries.get(index)!;
      entryMap = entryMap.set(
        'data',
        addFileTemplateFields(entryMap.get('path') as string, entryMap.get('data') as unknown as ImmutableMap<string, string>),
      ) as EntryMap;
      const title = selectEntryCollectionTitle(col, entryMap);
      return {
        ...e,
        title,
        isDir: false,
        isRoot: false,
      } as FlatNode;
    }),
  ];

  const parentsToChildren = flatData.reduce((acc: Record<string, FlatNode[]>, node: FlatNode) => {
    const parent = node.path === rootFolder ? '' : dirname(node.path);
    if (acc[parent]) {
      acc[parent].push(node);
    } else {
      acc[parent] = [node];
    }
    return acc;
  }, {} as Record<string, FlatNode[]>);

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
  collection: Collection;
  entries: ImmutableList<EntryMap>;
  filterTerm?: string;
}

interface NestedCollectionState {
  treeData: TreeNodeData[];
  selected: TreeNodeData | null;
  useFilter: boolean;
}

export class NestedCollection extends React.Component<NestedCollectionProps, NestedCollectionState> {
  static propTypes = {
    collection: ImmutablePropTypes.map.isRequired,
    entries: ImmutablePropTypes.list.isRequired,
    filterTerm: PropTypes.string,
  };

  constructor(props: NestedCollectionProps) {
    super(props);
    this.state = {
      treeData: getTreeData(this.props.collection, this.props.entries),
      selected: null,
      useFilter: true,
    };
  }

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(NestedCollection.propTypes, this.props, 'prop', 'NestedCollection');
  }

  componentDidUpdate(prevProps: NestedCollectionProps) {
    const { collection, entries, filterTerm } = this.props;
    if (
      collection !== prevProps.collection ||
      entries !== prevProps.entries ||
      filterTerm !== prevProps.filterTerm
    ) {
      const expanded: Record<string, boolean> = {};
      walk(this.state.treeData, (node: TreeNodeData) => {
        if (node.expanded) {
          expanded[node.path] = true;
        }
      });
      const treeData = getTreeData(collection, entries);

      const path = `/${filterTerm}`;
      walk(treeData, (node: TreeNodeData) => {
        if (expanded[node.path] || (this.state.useFilter && path.startsWith(node.path))) {
          node.expanded = true;
        }
      });
      this.setState({ treeData });
    }
  }

  onToggle = ({ node, expanded }: { node: TreeNodeData; expanded: boolean }) => {
    if (!this.state.selected || this.state.selected.path === node.path || expanded) {
      const treeData = updateNode(this.state.treeData, node, (node: TreeNodeData) => ({
        ...node,
        expanded,
      }));
      this.setState({ treeData, selected: node, useFilter: false });
    } else {
      // don't collapse non selected nodes when clicked
      this.setState({ selected: node, useFilter: false });
    }
  };

  render() {
    const { treeData } = this.state;
    const { collection } = this.props;

    return <TreeNode collection={collection} treeData={treeData} onToggle={this.onToggle} />;
  }
}

function mapStateToProps(state: State, ownProps: { collection: Collection }) {
  const { collection } = ownProps;
  const entries = selectEntries(state.entries as Entries, collection) || List();
  return { entries };
}

export default connect(mapStateToProps, null)(NestedCollection);
