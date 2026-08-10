import styled from '@emotion/styled';
import React from 'react';

import { colors, Icon, lengths, zIndex } from '@/ui/default/index';

const SearchContainer = styled.div`
  height: 37px;
  display: flex;
  align-items: center;
  position: relative;
  /* Shrinks alongside the modal's responsive width (see MediaLibraryModal)
     instead of a fixed 400px that would overflow small viewports. */
  flex: 1 1 150px;
  max-width: 460px;
`;

const SearchInput = styled.input`
  background-color: ${colors.inputBackground};
  border-radius: ${lengths.borderRadius};

  font-size: 14px;
  padding: 10px 6px 10px 32px;
  width: 100%;
  position: relative;
  z-index: ${zIndex.zIndex1};

  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px ${colors.active};
  }
`;

const SearchIcon = styled(Icon)`
  position: absolute;
  top: 50%;
  left: 6px;
  z-index: ${zIndex.zIndex2};
  transform: translate(0, -50%);
  pointer-events: none;
`;

interface MediaLibrarySearchProps {
  value?: string | undefined;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled?: boolean;
}

function MediaLibrarySearch({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
}: MediaLibrarySearchProps) {
  return (
    <SearchContainer>
      <SearchIcon type="search" size="small" />
      <SearchInput
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />
    </SearchContainer>
  );
}

export default MediaLibrarySearch;
