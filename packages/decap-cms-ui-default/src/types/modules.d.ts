// Type declarations for external modules

// SVG imports
declare module '*.svg' {
  import type { FC, SVGProps } from 'react';
  const content: FC<SVGProps<SVGSVGElement>>;
  export default content;
}

// react-transition-group types
declare module 'react-transition-group' {
  import type { ComponentType, ReactNode } from 'react';

  export interface CSSTransitionClassNames {
    appear?: string;
    appearActive?: string;
    appearDone?: string;
    enter?: string;
    enterActive?: string;
    enterDone?: string;
    exit?: string;
    exitActive?: string;
    exitDone?: string;
  }

  export interface CSSTransitionProps {
    in?: boolean;
    appear?: boolean;
    enter?: boolean;
    exit?: boolean;
    mountOnEnter?: boolean;
    unmountOnExit?: boolean;
    classNames?: string | CSSTransitionClassNames;
    timeout: number | { appear?: number; enter?: number; exit?: number };
    onEnter?: (node: HTMLElement, isAppearing: boolean) => void;
    onEntering?: (node: HTMLElement, isAppearing: boolean) => void;
    onEntered?: (node: HTMLElement, isAppearing: boolean) => void;
    onExit?: (node: HTMLElement) => void;
    onExiting?: (node: HTMLElement) => void;
    onExited?: (node: HTMLElement) => void;
    children?: ReactNode;
    nodeRef?: React.RefObject<HTMLElement>;
  }

  export const CSSTransition: ComponentType<CSSTransitionProps>;
  export const TransitionGroup: ComponentType<{
    component?: string | ComponentType | null;
    children?: ReactNode;
    appear?: boolean;
    enter?: boolean;
    exit?: boolean;
  }>;
}

// react-aria-menubutton types
declare module 'react-aria-menubutton' {
  import type { ComponentType, ReactNode, HTMLAttributes, ButtonHTMLAttributes } from 'react';

  export interface WrapperProps extends HTMLAttributes<HTMLDivElement> {
    onSelection?: (value: unknown, event: React.SyntheticEvent) => void;
    closeOnSelection?: boolean;
    closeOnBlur?: boolean;
    tag?: string;
    children?: ReactNode;
  }

  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    tag?: string;
    children?: ReactNode;
  }

  export interface MenuProps extends HTMLAttributes<HTMLDivElement> {
    tag?: string;
    children?: ReactNode;
  }

  export interface MenuItemProps extends HTMLAttributes<HTMLDivElement> {
    tag?: string;
    value?: unknown;
    text?: string;
    children?: ReactNode;
  }

  export const Wrapper: ComponentType<WrapperProps>;
  export const Button: ComponentType<ButtonProps>;
  export const Menu: ComponentType<MenuProps>;
  export const MenuItem: ComponentType<MenuItemProps>;
}

// react-immutable-proptypes
declare module 'react-immutable-proptypes' {
  import type { Requireable, Validator } from 'prop-types';

  interface ImmutablePropTypes {
    list: Requireable<unknown>;
    map: Requireable<unknown>;
    orderedMap: Requireable<unknown>;
    set: Requireable<unknown>;
    orderedSet: Requireable<unknown>;
    stack: Requireable<unknown>;
    seq: Requireable<unknown>;
    record: Requireable<unknown>;
    contains: (shape: Record<string, Validator<unknown>>) => Requireable<unknown>;
    mapContains: (shape: Record<string, Validator<unknown>>) => Requireable<unknown>;
    listOf: (typeChecker: Validator<unknown>) => Requireable<unknown>;
    mapOf: (
      valuesTypeChecker: Validator<unknown>,
      keysTypeChecker?: Validator<unknown>
    ) => Requireable<unknown>;
    orderedMapOf: (
      valuesTypeChecker: Validator<unknown>,
      keysTypeChecker?: Validator<unknown>
    ) => Requireable<unknown>;
    setOf: (typeChecker: Validator<unknown>) => Requireable<unknown>;
    orderedSetOf: (typeChecker: Validator<unknown>) => Requireable<unknown>;
    stackOf: (typeChecker: Validator<unknown>) => Requireable<unknown>;
    iterableOf: (typeChecker: Validator<unknown>) => Requireable<unknown>;
    recordOf: (shape: Record<string, Validator<unknown>>) => Requireable<unknown>;
    shape: (shape: Record<string, Validator<unknown>>) => Requireable<unknown>;
  }

  const ImmutablePropTypes: ImmutablePropTypes;
  export default ImmutablePropTypes;
}

// Immutable.js types
declare module 'immutable' {
  export interface List<T> {
    get(index: number, notSetValue?: T): T | undefined;
    set(index: number, value: T): List<T>;
    push(...values: T[]): List<T>;
    map<M>(mapper: (value: T, key: number, iter: List<T>) => M): List<M>;
    filter(predicate: (value: T, index: number, iter: List<T>) => boolean): List<T>;
    reduce<R>(reducer: (reduction: R, value: T, key: number, iter: List<T>) => R, initialReduction: R): R;
    toJS(): T[];
    toArray(): T[];
    size: number;
    [Symbol.iterator](): IterableIterator<T>;
  }

  export interface Map<K, V> {
    get<T = V>(key: K, notSetValue?: T): T;
    set(key: K, value: V): Map<K, V>;
    setIn(keyPath: Iterable<unknown>, value: unknown): Map<K, V>;
    getIn(keyPath: Iterable<unknown>, notSetValue?: unknown): unknown;
    remove(key: K): Map<K, V>;
    delete(key: K): Map<K, V>;
    update(key: K, updater: (value: V) => V): Map<K, V>;
    updateIn(keyPath: Iterable<unknown>, updater: (value: unknown) => unknown): Map<K, V>;
    merge(...collections: Array<Iterable<[K, V]> | { [key: string]: V } | Record<string, unknown>>): Map<K, V>;
    toJS(): { [key: string]: unknown };
    toObject(): { [key: string]: V };
    has(key: K): boolean;
    filter(predicate: (value: V, key: K, iter: Map<K, V>) => boolean): Map<K, V>;
    [Symbol.iterator](): IterableIterator<[K, V]>;
  }

  export function List<T>(collection?: Iterable<T> | ArrayLike<T>): List<T>;
  export namespace List {
    function isList(maybeList: unknown): maybeList is List<unknown>;
  }
  export function Map<K = string, V = unknown>(collection?: Iterable<[K, V]> | { [key: string]: V }): Map<K, V>;
  export namespace Map {
    function isMap(maybeMap: unknown): maybeMap is Map<unknown, unknown>;
  }
  export function fromJS(jsValue: unknown): unknown;
}
