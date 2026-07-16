import { css, keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { colors, zIndex } from './styles';

import type { SerializedStyles } from '@emotion/react';

const FADE_ENTER_MS = 500;
const FADE_EXIT_MS = 300;

const fadeInKeyframes = keyframes`
  from {
    opacity: 0.01;
  }
  to {
    opacity: 1;
  }
`;

const fadeOutKeyframes = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0.01;
  }
`;

interface LoaderStyles {
  disabled: SerializedStyles;
  active: SerializedStyles;
}

const styles: LoaderStyles = {
  disabled: css`
    display: none;
  `,
  active: css`
    display: block;
  `,
};

interface LoaderAnimations {
  loader: ReturnType<typeof keyframes>;
}

const animations: LoaderAnimations = {
  loader: keyframes`
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  `,
};

const LoaderText = styled.div`
  width: auto !important;
  height: auto !important;
  text-align: center;
  color: #767676;
  margin-top: 55px;
  line-height: 35px;
`;

const LoaderItem = styled.div`
  position: absolute;
  white-space: nowrap;
  transform: translateX(-50%);
`;

const LoaderItemEnter = styled(LoaderItem)`
  animation: ${fadeInKeyframes} ${FADE_ENTER_MS}ms ease-in forwards;
`;

const LoaderItemExit = styled(LoaderItem)`
  animation: ${fadeOutKeyframes} ${FADE_EXIT_MS}ms ease-in forwards;
`;

export interface LoaderProps {
  children?: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function Loader({ children, className }: LoaderProps) {
  const [currentItem, setCurrentItem] = React.useState(0);
  const [exitingItem, setExitingItem] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!Array.isArray(children)) return;
    const interval = setInterval(() => {
      setCurrentItem(prev => {
        setExitingItem(prev);
        return prev === children.length - 1 ? 0 : prev + 1;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [children]);

  React.useEffect(() => {
    if (exitingItem === null) return;
    const timeout = setTimeout(() => setExitingItem(null), FADE_EXIT_MS);
    return () => clearTimeout(timeout);
  }, [exitingItem]);

  let content: React.ReactNode = null;
  if (typeof children === 'string') {
    content = <LoaderText>{children}</LoaderText>;
  } else if (Array.isArray(children)) {
    content = (
      <LoaderText>
        {exitingItem !== null && <LoaderItemExit key={`exit-${exitingItem}`}>{children[exitingItem]}</LoaderItemExit>}
        <LoaderItemEnter key={`enter-${currentItem}`}>{children[currentItem]}</LoaderItemEnter>
      </LoaderText>
    );
  }

  return <div className={className}>{content}</div>;
}

export interface StyledLoaderProps {
  active?: boolean;
}

const StyledLoader = styled(Loader)<StyledLoaderProps>`
  display: ${(props: StyledLoaderProps) => (props.active ? 'block' : 'none')};
  position: absolute;
  top: 50%;
  left: 50%;
  margin: 0;
  text-align: center;
  z-index: ${zIndex.zIndex1000};
  transform: translateX(-50%) translateY(-50%);

  &:before,
  &:after {
    content: '';
    position: absolute;
    top: 0%;
    left: 50%;
    width: 2.2857rem;
    height: 2.2857rem;
    margin: 0 0 0 -1.1429rem;
    border-radius: 500rem;
    border-style: solid;
    border-width: 0.2em;
  }

  /* Static Shape */
  &:before {
    border-color: rgb(0 0 0 / 0.1);
  }

  /* Active Shape */
  &:after {
    animation: ${animations.loader} 0.6s linear;
    animation-iteration-count: infinite;
    border-color: ${colors.active} transparent transparent;
    box-shadow: 0 0 0 1px transparent;
  }
`;

export default StyledLoader;
