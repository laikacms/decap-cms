// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import styled from '@emotion/styled';
import { zIndex } from '../ui-default/index';

export const editorStyleVars = {
  stickyDistanceBottom: '100px',
};

export const EditorControlBar = styled.div`
  z-index: ${zIndex.zIndex200};
  position: sticky;
  top: 0;
  margin-bottom: ${editorStyleVars.stickyDistanceBottom};
`;