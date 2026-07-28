import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { connect } from 'react-redux';
import { lengths, components, colors } from 'decap-cms-ui-default';

import { loadEntries } from '../../actions/entries';
import { selectIntegrityIssues } from '../../reducers';
import IntegrityIssueTypes from '../../constants/integrityIssueTypes';

const IntegrityCheckContainer = styled.div`
  padding: ${lengths.pageMargin} 0;
`;

const IntegrityCheckTop = styled.div`
  ${components.cardTop};
`;

const IntegrityCheckTopHeading = styled.h1`
  ${components.cardTopHeading};
`;

const IntegrityCheckTopDescription = styled.p`
  ${components.cardTopDescription};
`;

const IssueList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 ${lengths.pageMargin};
`;

const IssueItem = styled.li`
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 4px;
  background: #fff;
  border: 1px solid ${colors.textFieldBorder};
`;

/**
 * A read-only, first-slice surface for DCMS-1422 item 1: it renders whatever
 * `selectIntegrityIssues` finds in the store right now, and kicks off loading
 * the first page of every collection's entries on mount so a scan run from a
 * cold store has something to look at. It doesn't crawl beyond the first
 * page of paginated collections yet - see the doc comment on
 * `selectIntegrityIssues` for the same caveat.
 */
export class IntegrityCheck extends Component {
  static propTypes = {
    collections: ImmutablePropTypes.map.isRequired,
    issues: PropTypes.array.isRequired,
    loadEntries: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(IntegrityCheck.propTypes, this.props, 'prop', 'IntegrityCheck');

    const { collections, loadEntries } = this.props;
    collections.forEach(collection => {
      if (collection) {
        loadEntries(collection);
      }
    });
  }

  renderIssueMessage(issue) {
    const { t } = this.props;

    if (issue.type === IntegrityIssueTypes.DANGLING_RELATION) {
      return t('integrityCheck.integrityCheck.danglingRelation', {
        collection: issue.collection,
        slug: issue.slug,
        field: issue.field,
        value: issue.value,
        targetCollection: issue.targetCollection,
      });
    }

    return t('integrityCheck.integrityCheck.duplicateUniqueValue', {
      collection: issue.collection,
      slug: issue.slug,
      field: issue.field,
      value: issue.value,
      duplicateSlug: issue.duplicateSlug,
    });
  }

  render() {
    const { issues, t } = this.props;

    return (
      <IntegrityCheckContainer>
        <IntegrityCheckTop>
          <IntegrityCheckTopHeading>
            {t('integrityCheck.integrityCheck.heading')}
          </IntegrityCheckTopHeading>
          <IntegrityCheckTopDescription>
            {issues.length > 0
              ? t('integrityCheck.integrityCheck.description', { smart_count: issues.length })
              : t('integrityCheck.integrityCheck.noIssues')}
          </IntegrityCheckTopDescription>
        </IntegrityCheckTop>
        {issues.length > 0 && (
          <IssueList>
            {issues.map((issue, index) => (
              <IssueItem
                key={`${issue.type}-${issue.collection}-${issue.slug}-${issue.field}-${index}`}
              >
                {this.renderIssueMessage(issue)}
              </IssueItem>
            ))}
          </IssueList>
        )}
      </IntegrityCheckContainer>
    );
  }
}

function mapStateToProps(state) {
  return {
    collections: state.collections,
    issues: selectIntegrityIssues(state),
  };
}

const mapDispatchToProps = {
  loadEntries,
};

export default connect(mapStateToProps, mapDispatchToProps)(translate()(IntegrityCheck));
