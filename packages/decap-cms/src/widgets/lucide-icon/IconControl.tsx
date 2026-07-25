import styled from '@emotion/styled';
import { ChevronDownIcon, ChevronUpIcon, icons as lucideIcons } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { colors, shadows } from '@/ui/default/index';
import { useRovingIconFocus } from '@/widgets/icon-picker/useRovingIconFocus';

import type { CmsWidgetControlProps } from '@/lib/util/index';
import type { IconWidgetOptions } from './types';

const allIcons = Object.fromEntries(Object.entries(lucideIcons));

const IconGrid = styled.div`
  ${shadows.inset};
`;

export type IconControlProps = CmsWidgetControlProps<string> & Pick<IconWidgetOptions, 'filter'>;

export const IconControl: React.FC<IconControlProps> = props => {
  const [isOpen, setIsOpen] = useState(false);

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

  const filteredIcons = useMemo(() => {
    return Object.keys(allIcons).filter(icon => {
      if (!icon.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter instanceof RegExp) return filter.test(icon);
      if (typeof filter === 'function') return filter(icon);
      return true;
    });
  }, [search, filter]);
  const { onArrowKeyDown, onIconFocus, rovingIconName } = useRovingIconFocus(filteredIcons, value);

  const onFocus = () => {
    setIsOpen(true);
    setActiveStyle();
  };

  const onBlur = () => {
    setInactiveStyle();
  };

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
        {value && allIcons[value]
          && React.createElement(allIcons[value as keyof typeof allIcons], {
            width: 24,
            height: 24,
            style: { margin: 8 },
          })}
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
          <IconGrid
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridAutoRows: '46px',
              height: '300px',
              overflowY: 'auto',
              gap: '4px',
              padding: '8px',
              background: colors.textFieldBorder,
            }}
          >
            {filteredIcons.map((iconName, index) => {
              return (
                <div
                  key={iconName}
                  title={iconName}
                  role="button"
                  tabIndex={iconName === rovingIconName ? 0 : -1}
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
                  onFocus={() => onIconFocus(iconName)}
                  onClick={() => props.onChange(iconName)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      props.onChange(iconName);
                      return;
                    }

                    onArrowKeyDown(e, index);
                  }}
                >
                  {allIcons[iconName]
                    && React.createElement(allIcons[iconName as keyof typeof allIcons], {
                      width: 24,
                      height: 24,
                      color: iconName === props.value ? colors.textLight : colors.text,
                    })}
                </div>
              );
            })}
            {filteredIcons.length === 0 && t('mediaLibrary.mediaLibraryModal.noResults')}
          </IconGrid>
        </div>
      )}
    </div>
  );
};
