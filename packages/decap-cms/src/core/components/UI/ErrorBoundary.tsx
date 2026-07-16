import styled from '@emotion/styled';
import { truncate } from 'lodash-es';
import React from 'react';
import yaml from 'yaml';

import { translate } from '@/core/i18n';
import { localForage } from '@/lib/util/index';
import { buttons, colors } from '@/ui/default/index';

import type { CmsConfig } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const ISSUE_URL = 'https://github.com/decaporg/decap-cms/issues/new';

function getIssueTemplate({
  version,
  provider,
  browser,
  config,
}: {
  version: string,
  provider: string,
  browser: string,
  config: string,
}) {
  return `
**Describe the bug**

**To Reproduce**

**Expected behavior**

**Screenshots**

**Applicable Versions:**
 - Decap CMS version: \`${version}\`
 - Git provider: \`${provider}\`
 - Browser version: \`${browser}\`

**CMS configuration**
\`\`\`
${config}
\`\`\`

**Additional context**
`;
}

function buildIssueTemplate({ config }: { config: CmsConfig }) {
  let version = '';
  if (typeof DECAP_CMS_VERSION === 'string') {
    version = `decap-cms@${DECAP_CMS_VERSION}`;
  } else if (typeof DECAP_CMS_APP_VERSION === 'string') {
    version = `decap-cms-app@${DECAP_CMS_APP_VERSION}`;
  }
  const template = getIssueTemplate({
    version,
    provider: config.backend.name,
    browser: navigator.userAgent,
    config: yaml.stringify(config),
  });

  return template;
}

function buildIssueUrl({ title, config }: { title: string, config: CmsConfig }) {
  const issueUrl = config?.issue_reports?.url ?? ISSUE_URL;
  try {
    const body = buildIssueTemplate({ config });

    const params = new URLSearchParams();
    params.append('title', truncate(title, { length: 100 }));
    params.append('body', truncate(body, { length: 4000, omission: '\n...' }));
    params.append('labels', 'type: bug');

    return `${issueUrl}?${params.toString()}`;
  } catch (e: unknown) {
    console.log(e);
    return `${issueUrl}?template=bug_report.md`;
  }
}

const ErrorBoundaryContainer = styled.div`
  padding: 40px;

  h1 {
    font-size: 28px;
    color: ${colors.text};
  }

  h2 {
    font-size: 20px;
  }

  strong {
    color: ${colors.textLead};
    font-weight: 500;
  }

  hr {
    width: 200px;
    margin: 30px 0;
    border: 0;
    height: 1px;
    background-color: ${colors.text};
  }

  a {
    color: ${colors.active};
  }
`;

const PrivacyWarning = styled.span`
  color: ${colors.text};
`;

const CopyButton = styled.button`
  ${buttons.button};
  ${buttons.default};
  ${buttons.gray};
  display: block;
  margin: 12px 0;
`;

function RecoveredEntry({ entry, t }: { entry: string, t: TranslateFunction }) {
  console.log(entry);
  return (
    <>
      <hr />
      <h2>{t('ui.errorBoundary.recoveredEntry.heading')}</h2>
      <strong>{t('ui.errorBoundary.recoveredEntry.warning')}</strong>
      <CopyButton onClick={() => navigator.clipboard.writeText(entry)}>
        {t('ui.errorBoundary.recoveredEntry.copyButtonLabel')}
      </CopyButton>
      <pre>
        <code>{entry}</code>
      </pre>
    </>
  );
}

/**
 * Props passed to a custom error renderer. Consumers that supply `renderError`
 * to `ErrorBoundary` receive the same data the default screen uses, plus the
 * Github issue URL pre-computed so the renderer stays presentational.
 */
export interface ErrorBoundaryRenderProps {
  errorTitle: string;
  errorMessage: string;
  /** Pre-built Github issue URL for this error and config. */
  issueUrl: string;
  /** Recovered draft JSON, if any. Only populated when `showBackup` is on. */
  backup?: string;
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
  showBackup?: boolean;
  t: TranslateFunction;
  config: CmsConfig;
  /**
   * Replace the default error screen with a custom render. When provided
   * and the boundary has caught an error, this is rendered in place of the
   * default `<ErrorBoundaryContainer>` layout.
   */
  renderError?: (props: ErrorBoundaryRenderProps) => React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  state = {
    hasError: false,
    errorMessage: '',
    errorTitle: '',
    backup: '',
  };

  static getDerivedStateFromError(error: Error) {
    console.error(error);
    return {
      hasError: true,
      errorMessage: error.stack || error.toString(),
      errorTitle: error.toString(),
    };
  }

  shouldComponentUpdate(nextProps: ErrorBoundaryProps, nextState: typeof this.state) {
    if (this.props.showBackup) {
      return (
        this.state.errorMessage !== nextState.errorMessage || this.state.backup !== nextState.backup
      );
    }
    return true;
  }

  async componentDidUpdate() {
    if (this.props.showBackup) {
      const backup = await localForage.getItem('backup');
      if (backup) console.log('Recovered backup:', backup);
      this.setState({ backup });
    }
  }

  render() {
    const { hasError, errorMessage, backup, errorTitle } = this.state;
    const { showBackup, t, renderError } = this.props;
    if (!hasError) {
      return this.props.children;
    }
    if (renderError) {
      return renderError({
        errorTitle,
        errorMessage,
        issueUrl: buildIssueUrl({ title: errorTitle, config: this.props.config }),
        backup: showBackup ? backup : undefined,
      });
    }
    return (
      <ErrorBoundaryContainer>
        <h1>{t('ui.errorBoundary.title')}</h1>
        <p>
          <span>{t('ui.errorBoundary.details')}</span>
          <a
            href={buildIssueUrl({ title: errorTitle, config: this.props.config })}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="issue-url"
          >
            {t('ui.errorBoundary.reportIt')}
          </a>
        </p>
        <p>
          {t('ui.errorBoundary.privacyWarning')
            .split('\n')
            .map((item, index) => (
              <React.Fragment key={index}>
                <PrivacyWarning>{item}</PrivacyWarning>
                <br />
              </React.Fragment>
            ))}
        </p>
        <hr />
        <h2>{t('ui.errorBoundary.detailsHeading')}</h2>
        <p>{errorMessage}</p>
        {backup && showBackup && <RecoveredEntry entry={backup} t={t} />}
      </ErrorBoundaryContainer>
    );
  }
}

export default translate()(ErrorBoundary);
