import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import React, { useEffect, useMemo, useState } from 'react';

import { colors } from '@/ui/default/index';

import type { CmsWidgetControlProps } from '@/lib/util/index';
import type { IconWidgetOptions } from './types';

// Structural stand-in for `IconProps` from `@radix-ui/react-icons/dist/types`
// so we don't depend on the package's internal file layout.
type RadixIconProps = React.SVGAttributes<SVGElement> & { color?: string };
type RadixIconComponent = React.ForwardRefExoticComponent<RadixIconProps & React.RefAttributes<SVGSVGElement>>;

export type IconControlProps = CmsWidgetControlProps<string> & Pick<IconWidgetOptions, 'filter'>;

export const IconControl: React.FC<IconControlProps> = props => {
  const [isOpen, setIsOpen] = useState(false);

  const [allIcons, setAllIcons] = useState<Record<string, RadixIconComponent>>({});

  useEffect(() => {
    import('@radix-ui/react-icons').then(module => {
      const icons = Object.fromEntries(Object.entries(module).filter(([key]) => key.endsWith('Icon')));
      setAllIcons(icons as Record<string, RadixIconComponent>);
    });
  }, []);

  const {
    value,
    forID,
    classNameWrapper,
    setActiveStyle,
    setInactiveStyle,
    t,
    filter,
  } = props;

  const [search, setSearch] = React.useState('');

  const icons = useMemo(() => {
    return Object.keys(allIcons).filter(iconName => {
      if (!iconName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter instanceof RegExp) return filter.test(iconName);
      if (typeof filter === 'function') return filter(iconName);
      return true;
    });
  }, [search, allIcons, filter]);

  const onFocus = () => {
    setIsOpen(true);
    setActiveStyle();
  };

  const onBlur = () => {
    setInactiveStyle();
  };

  const SelectedIcon = allIcons[props.value as keyof typeof allIcons] || undefined;

  return (
    <div
      className={classNameWrapper}
      style={{ padding: '0' }}
    >
      <div
        title={value}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5em',
          position: 'relative',
          backgroundColor: colors.textFieldBorder,
        }}
      >
        {SelectedIcon && (
          <SelectedIcon
            width={24}
            height={24}
            color={colors.text}
            style={{ margin: '8px 0 8px 8px' }}
          />
        )}
        <button
          type="button"
          aria-label={t('editor.editorWidgets.iconPicker.toggle')}
          onClick={() => setIsOpen(isOpen => !isOpen)}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: colors.text,
            borderRadius: '3px',
            margin: '8px 8px 8px auto',
          }}
          onMouseDown={e => e.preventDefault()}
        >
          {isOpen ? <ChevronUpIcon width={24} height={24} /> : <ChevronDownIcon width={24} height={24} />}
        </button>
      </div>
      {isOpen && (
        <div>
          <input
            id={forID}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('mediaLibrary.mediaLibraryModal.search')}
            type="search"
            onFocus={onFocus}
            onBlur={onBlur}
            autoComplete="off"
            style={{
              width: '100%',
              backgroundColor: colors.inputBackground,
              border: 'none',
              borderRadius: '3px',
              padding: '16px 20px',
              fontSize: '1em',
              outline: 'none',
            }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridAutoRows: '46px',
              height: '300px',
              overflowY: 'auto',
              gap: '4px',
              fontSize: '1.2em',
              padding: '8px',
              background: colors.textFieldBorder,
            }}
          >
            {icons.map(iconName => {
              const Icon = allIcons[iconName as keyof typeof allIcons];
              return (
                <div
                  key={iconName}
                  title={iconName}
                  role="button"
                  tabIndex={0}
                  aria-pressed={iconName === props.value}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: iconName === props.value ? colors.active : colors.inputBackground,
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => props.onChange(iconName)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      props.onChange(iconName);
                    }
                  }}
                >
                  <Icon width={24} height={24} color={iconName === props.value ? colors.textLight : colors.text} />
                </div>
              );
            })}
            {icons.length === 0 && t('mediaLibrary.mediaLibraryModal.noResults')}
          </div>
        </div>
      )}
    </div>
  );
};
