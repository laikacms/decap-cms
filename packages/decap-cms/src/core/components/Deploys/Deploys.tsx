import styled from '@emotion/styled';
import React, { useCallback, useEffect, useMemo } from 'react';
import { shallowEqual } from 'react-redux';

import { loadDeployHistory, selectCommitUrl } from '@/core/actions/deployStatus';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { useTranslate } from '@/core/i18n';
import { buttons, colors, components, Icon, lengths, shadows } from '@/ui/default/index';
import { isStaleDeploy, StatusDot } from './deployStatusIndicator';
import {
  branchOf,
  formatTime,
  liveDeployIds,
  rowId,
  stateColorFor,
  stateKeyFor,
  summaryFor,
  targetOf,
  whereOf,
} from './deploysView';

import type { DeployStatusState } from '@/core/reducers/deployStatus';
import type { Deployment } from '@/lib/backend/index';

/**
 * The Deploys page. The band on top answers the editor's "is my change live"
 * first; the table below answers the developer's "which build, why did it
 * fail". A plain table: filtering, sorting and paging wait until someone asks.
 */

const DeploysContainer = styled.div`
  min-height: 100vh;
  margin: ${lengths.pageMarginMobile};
  @media (min-width: 500px) {
    margin: ${lengths.pageMargin};
  }
`;

const DeploysTop = styled.div`
  ${components.cardTop};
`;

const DeploysTopRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
`;

const DeploysTopHeading = styled.h1`
  ${components.cardTopHeading};
`;

const DeploysTopDescription = styled.p`
  ${components.cardTopDescription};
`;

const RefreshButton = styled.button`
  ${buttons.button};
  ${buttons.default};
  ${buttons.gray};
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const SummaryLink = styled.a`
  ${buttons.button};
  ${buttons.default};
  ${buttons.lightBlue};
  text-decoration: none;
  display: inline-block;
  margin-top: 12px;
`;

const Card = styled.div`
  ${components.card};
  ${shadows.dropMain};
  padding: 16px 20px;
  margin-bottom: 16px;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th,
  td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid ${colors.textFieldBorder};
    vertical-align: top;
  }

  th {
    color: ${colors.controlLabel};
    font-weight: 600;
    white-space: nowrap;
  }
`;

const StateCell = styled.span<{ stateColor: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  color: ${props => props.stateColor};
  font-weight: 600;
`;

const StateLink = styled.a`
  color: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Muted = styled.p`
  color: ${colors.text};
  margin: 0;
`;

const ErrorText = styled.p`
  color: ${colors.errorText};
  margin: 4px 0 0;
  font-weight: 400;
`;

const Commit = styled.code`
  font-family: monospace;
`;

/** The page refreshes itself this often while open and visible. */
export const DEPLOYS_REFRESH_MS = 10000;

type DeploysView = Pick<
  DeployStatusState,
  'deployments' | 'pendingCount' | 'latest' | 'isFetching' | 'loaded' | 'error' | 'entryLabels' | 'branch'
>;

function selectView(state: { deployStatus: DeployStatusState }): DeploysView {
  const { deployments, pendingCount, latest, isFetching, loaded, error, entryLabels, branch } = state.deployStatus;
  return { deployments, pendingCount, latest, isFetching, loaded, error, entryLabels, branch };
}

/**
 * Where each listed commit can be read, derived rather than stored: it depends
 * only on the backend, and a copy in the store would be one more thing that
 * can go stale.
 */
function useCommitUrls(deployments: Deployment[]) {
  return useAppSelector(state => {
    const urls: Record<string, string | null> = {};
    for (const row of deployments) {
      if (!(row.commit_sha in urls)) {
        urls[row.commit_sha] = selectCommitUrl(state, row.commit_sha);
      }
    }
    return urls;
  }, shallowEqual);
}

export default function Deploys() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const { deployments, pendingCount, latest, isFetching, loaded, error, entryLabels, branch } = useAppSelector(
    selectView,
    shallowEqual,
  );
  const commitUrls = useCommitUrls(deployments);

  const refresh = useCallback(
    (silent: boolean) => {
      void dispatch(loadDeployHistory({ silent }));
    },
    [dispatch],
  );

  // Opening the page reads once, then every ten seconds while it is open and
  // visible. This is the only repeating read the feature makes on its own; it
  // stops when the editor leaves the page, so an idle CMS polls zero times.
  // `silent` so the Refresh button does not flicker every ten seconds.
  useEffect(() => {
    refresh(false);

    let timer: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (timer === null) {
        timer = setInterval(() => refresh(true), DEPLOYS_REFRESH_MS);
      }
    }
    function stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }
    // A background tab is not being watched, so it has no reason to keep
    // reading; coming back is a good moment to read once, immediately.
    function onVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        refresh(true);
        start();
      }
    }

    start();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  // One clock per render, so a row cannot be fresh at the top and stale further down.
  const now = Date.now();
  const summary = summaryFor(pendingCount, latest, now);
  const targets = useMemo(() => [...new Set(deployments.map(targetOf))].sort(), [deployments]);
  const liveIds = useMemo(() => liveDeployIds(deployments), [deployments]);
  const liveUrl = latest && latest.state === 'success' ? latest.target_url : null;

  function renderRow(row: Deployment) {
    const stateKey = stateKeyFor(row, liveIds, now);
    const color = stateColorFor(row, now);
    // "Live" on another branch is true of that branch's own URL only, not the published site.
    const onOtherBranch = Boolean(branch) && Boolean(branchOf(row)) && branchOf(row) !== branch;
    const title = isStaleDeploy(row, now)
      ? t('ui.deploys.stalledHint')
      : stateKey === 'ui.deploys.state.live' && onOtherBranch
      ? t('ui.deploys.liveOnBranchHint')
      : undefined;
    const commit = <Commit>{row.commit_sha.slice(0, 7)}</Commit>;
    const commitUrl = commitUrls[row.commit_sha];

    return (
      <tr key={rowId(row)}>
        <td>
          <StateCell stateColor={color} title={title}>
            <StatusDot color={color} />
            {row.target_url
              ? (
                <StateLink href={row.target_url} target="_blank" rel="noopener noreferrer">
                  {t(stateKey)}
                </StateLink>
              )
              : t(stateKey)}
          </StateCell>
          {row.error_message && <ErrorText>{row.error_message}</ErrorText>}
        </td>
        {/* The entry's title, as the "your change is live" notification shows it. */}
        <td>{entryLabels[row.commit_sha] || <Muted as="span">-</Muted>}</td>
        <td>{whereOf(row)}</td>
        <td>{targetOf(row)}</td>
        <td>
          {/* Never the deployed site: that looks like it shows the change and shows the home page. */}
          {commitUrl
            ? (
              <a href={commitUrl} target="_blank" rel="noopener noreferrer">
                {commit}
              </a>
            )
            : commit}
        </td>
        <td>{formatTime(row.finished_at || row.updated_at)}</td>
      </tr>
    );
  }

  return (
    <DeploysContainer>
      <DeploysTop>
        <DeploysTopRow>
          <DeploysTopHeading>{t('ui.deploys.heading')}</DeploysTopHeading>
          <RefreshButton type="button" onClick={() => refresh(false)} disabled={isFetching}>
            <Icon type="refresh" size="small" />
            {isFetching ? t('ui.deploys.refreshing') : t('ui.deploys.refresh')}
          </RefreshButton>
        </DeploysTopRow>
        <DeploysTopDescription>{t(summary.key, summary.options)}</DeploysTopDescription>
        {liveUrl && (
          <SummaryLink href={liveUrl} target="_blank" rel="noopener noreferrer">
            {t('ui.deploys.viewSite')}
          </SummaryLink>
        )}
      </DeploysTop>

      {error && (
        <Card>
          <ErrorText role="alert">{t('ui.deploys.loadError', { details: error })}</ErrorText>
        </Card>
      )}

      {targets.length > 1 && (
        <Card>
          <Muted>{t('ui.deploys.multipleTargets', { targets: targets.join(', ') })}</Muted>
        </Card>
      )}

      <Card>
        {deployments.length === 0
          ? (
            // Teaches rather than shrugs: a host that reports nothing is the most
            // likely reason someone opened this page.
            <Muted>{loaded ? t('ui.deploys.emptyConfigured') : t('ui.deploys.emptyUnknown')}</Muted>
          )
          : (
            <Table>
              <thead>
                <tr>
                  <th scope="col">{t('ui.deploys.columnState')}</th>
                  <th scope="col">{t('ui.deploys.columnEntry')}</th>
                  <th scope="col">{t('ui.deploys.columnWhere')}</th>
                  <th scope="col">{t('ui.deploys.columnTarget')}</th>
                  <th scope="col">{t('ui.deploys.columnCommit')}</th>
                  <th scope="col">{t('ui.deploys.columnWhen')}</th>
                </tr>
              </thead>
              <tbody>{deployments.map(renderRow)}</tbody>
            </Table>
          )}
      </Card>
    </DeploysContainer>
  );
}
