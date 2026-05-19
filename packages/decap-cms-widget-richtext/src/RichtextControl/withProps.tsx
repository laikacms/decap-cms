// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import React from 'react';

export default function withProps(Component, defaultProps) {
  const ComponentWithClassName = Component;

  return React.forwardRef(function ExtendComponent(props, ref) {
    return <ComponentWithClassName ref={ref} {...defaultProps} {...props} />;
  });
}