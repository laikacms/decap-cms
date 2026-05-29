import React from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';
import { CSSTransition } from 'react-transition-group';

import { colors, zIndex } from './styles';

import type { SerializedStyles } from '@emotion/react';

interface LoaderStyles {
  disabled: SerializedStyles;
  active: SerializedStyles;
  enter: SerializedStyles;
  enterActive: SerializedStyles;
  exit: SerializedStyles;
  exitActive: SerializedStyles;
}

const styles: LoaderStyles = {
  disabled: css`
    display: none;
  `,
  active: css`
    display: block;
  `,
  enter: css`
    opacity: 0.01;
  `,
  enterActive: css`
    opacity: 1;
    transition: opacity 500ms ease-in;
  `,
  exit: css`
    opacity: 1;
  `,
  exitActive: css`
    opacity: 0.01;
    transition: opacity 300ms ease-in;
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

export interface LoaderProps {
  children?: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function Loader({ children, className }: LoaderProps) {
  const [currentItem, setCurrentItem] = React.useState(0);

  React.useEffect(() => {
    if (!Array.isArray(children)) return;
    const interval = setInterval(() => {
      setCurrentItem(prev => (prev === children.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [children]);

  let content: React.ReactNode = null;
  if (typeof children === 'string') {
    content = <LoaderText>{children}</LoaderText>;
  } else if (Array.isArray(children)) {
    content = (
      <LoaderText>
        <CSSTransition
          classNames={{
            enter: styles.enter.name,
            enterActive: styles.enterActive.name,
            exit: styles.exit.name,
            exitActive: styles.exitActive.name,
          }}
          timeout={500}
        >
          <LoaderItem key={currentItem}>{children[currentItem]}</LoaderItem>
        </CSSTransition>
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
