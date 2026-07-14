/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';

import { colors } from '@/ui/default/index';
import { useAppSelector } from '@/core/hooks/useRedux';

/**
 * Thin footer rendered below the routed content. Shows site name (when set
 * in config) and the package version so the bundle build is identifiable.
 */

const Bar = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  margin-top: 40px;
  border-top: 1px solid ${colors.textFieldBorder};
  font-size: 12px;
  color: ${colors.controlLabel};
`;

const FooterSide = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

function LaikaFooter() {
  const config = useAppSelector(state => state.config) as
    | { site_name?: string; name?: string }
    | null
    | undefined;
  const siteName = config?.site_name ?? config?.name;
  const version =
    typeof window !== 'undefined' && typeof window.DECAP_CMS_APP_VERSION === 'string'
      ? window.DECAP_CMS_APP_VERSION
      : undefined;

  return (
    <Bar>
      <FooterSide>{siteName ? <span>{siteName}</span> : null}</FooterSide>
      <FooterSide>
        <span>laika-cms-app</span>
        {version ? <span>· {version}</span> : null}
      </FooterSide>
    </Bar>
  );
}

export default LaikaFooter;
