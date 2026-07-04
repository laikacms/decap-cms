import React, { forwardRef } from 'react';

import { useRouter, useLocation } from './context';

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** The target path, e.g. `/collections/posts`. */
  to: string;
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
}

function isModifiedEvent(event: React.MouseEvent): boolean {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

/**
 * Whether a click should be handled as an in-app navigation. Modified clicks
 * (open-in-new-tab), non-left buttons, and links targeting another frame keep
 * the browser's default behaviour so `href` still works for them.
 */
function shouldHandleClick(event: React.MouseEvent, target?: string): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    (!target || target === '_self') &&
    !isModifiedEvent(event)
  );
}

/**
 * An anchor that navigates through our own router instead of react-router.
 * Renders a real `href` (so middle-click / open-in-new-tab / SEO all work) and
 * intercepts plain left-clicks to push through the router.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, target, onClick, children, ...rest },
  ref,
) {
  const router = useRouter();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (shouldHandleClick(event, target)) {
      event.preventDefault();
      if (replace) {
        router.replacePath(to);
      } else {
        router.push(to);
      }
    }
  }

  return (
    <a ref={ref} href={router.href(to)} target={target} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
});

export interface NavLinkProps extends Omit<LinkProps, 'className' | 'style' | 'children'> {
  /** Match `to` exactly instead of also matching sub-paths. */
  end?: boolean;
  className?: string | ((props: { isActive: boolean }) => string);
  style?: React.CSSProperties | ((props: { isActive: boolean }) => React.CSSProperties);
  children?: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
}

/** The class added to an active `<NavLink>` (matches the `&.active` CSS hooks). */
const ACTIVE_CLASS = 'active';

/**
 * Active when the current path equals `to`, or (unless `end`) is a sub-path of
 * it. `/` is special-cased to exact-match so it isn't active everywhere.
 */
function isActivePath(current: string, to: string, end?: boolean): boolean {
  if (end || to === '/') {
    return current === to;
  }
  return current === to || current.startsWith(`${to}/`);
}

/**
 * A `Link` that knows whether it points at the current location, adding the
 * `active` class (and supporting react-router's function-style `className` /
 * `style` / `children`). Replaces react-router's `NavLink`.
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end, className, style, children, ...rest },
  ref,
) {
  const { pathname } = useLocation();
  const isActive = isActivePath(pathname, to, end);

  const resolvedClassName =
    typeof className === 'function'
      ? className({ isActive })
      : [className, isActive ? ACTIVE_CLASS : null].filter(Boolean).join(' ') || undefined;
  const resolvedStyle = typeof style === 'function' ? style({ isActive }) : style;
  const resolvedChildren = typeof children === 'function' ? children({ isActive }) : children;

  return (
    <Link ref={ref} to={to} className={resolvedClassName} style={resolvedStyle} {...rest}>
      {resolvedChildren}
    </Link>
  );
});
