import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { lengths } from 'decap-cms-ui-default';

import {
  ToolbarContainer,
  ToolbarSectionBackLink,
  BackArrow,
  BackCollection,
} from './EditorToolbar';

const EntryNotFoundContainer = styled.div`
  width: 100%;
  min-width: 800px;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  padding-top: calc(66px + ${lengths.topBarHeight});
`;

const EntryNotFoundBody = styled.div`
  margin: 40px 20px;

  h1 {
    font-size: 24px;
    font-weight: 600;
  }
`;

/**
 * Rendered by Editor in place of EditorInterface when the requested entry
 * failed to load (DCMS-479). Keeps the toolbar/back-link chrome that the
 * normal editor route provides instead of unmounting to a bare error string,
 * and deliberately renders no preview pane, since there is no entry data to
 * preview.
 */
function EntryNotFound({ t, collection, editorBackLink, message }) {
  return (
    <EntryNotFoundContainer>
      <ToolbarContainer>
        <ToolbarSectionBackLink to={editorBackLink}>
          <BackArrow>←</BackArrow>
          <div>
            <BackCollection>
              {t('editor.editorToolbar.backCollection', {
                collectionLabel: collection.get('label'),
              })}
            </BackCollection>
          </div>
        </ToolbarSectionBackLink>
      </ToolbarContainer>
      <EntryNotFoundBody>
        <h1>{t('editor.editor.entryNotFoundHeader')}</h1>
        <p>{message}</p>
      </EntryNotFoundBody>
    </EntryNotFoundContainer>
  );
}

EntryNotFound.propTypes = {
  t: PropTypes.func.isRequired,
  collection: ImmutablePropTypes.map.isRequired,
  editorBackLink: PropTypes.string.isRequired,
  message: PropTypes.string,
};

export default EntryNotFound;
