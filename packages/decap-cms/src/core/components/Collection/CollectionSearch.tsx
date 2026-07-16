import styled from '@emotion/styled';
import React from 'react';

import { translate } from '@/core/i18n';
import { colors, colorsRaw, Icon, lengths, zIndex } from '@/ui/default/index';

import type { CmsCollections, CmsCollectionState } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const SearchContainer = styled.div`
  margin: 0 12px;
  position: relative;

  .decap-icon {
    position: absolute;
    top: 0;
    left: 6px;
    z-index: ${zIndex.zIndex2};
    height: 100%;
    display: flex;
    align-items: center;
    pointer-events: none;
  }
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  position: relative;
`;

const SearchInput = styled.input`
  background-color: #eff0f4;
  border-radius: ${lengths.borderRadius};
  font-size: 14px;
  padding: 10px 6px 10px 34px;
  width: 100%;
  position: relative;
  z-index: ${zIndex.zIndex1};

  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px ${colorsRaw.blue};
  }
`;

const SuggestionsContainer = styled.div`
  position: relative;
  width: 100%;
`;

const Suggestions = styled.ul`
  position: absolute;
  top: 6px;
  left: 0;
  right: 0;
  padding: 10px 0;
  margin: 0;
  list-style: none;
  background-color: #fff;
  border-radius: ${lengths.borderRadius};
  border: 1px solid ${colors.textFieldBorder};
  z-index: ${zIndex.zIndex1};
`;

const SuggestionHeader = styled.li`
  padding: 0 6px 6px 34px;
  font-size: 12px;
  color: ${colors.text};
`;

const SuggestionItem = styled.li<{ $isActive?: boolean }>(
  ({ $isActive }) => `
  color: ${$isActive ? colors.active : colorsRaw.grayDark};
  background-color: ${$isActive ? colors.activeBackground : 'inherit'};
  padding: 6px 6px 6px 34px;
  cursor: pointer;
  position: relative;

  &:hover {
    color: ${colors.active};
    background-color: ${colors.activeBackground};
  }
`,
);

const SuggestionDivider = styled.div`
  width: 100%;
`;

interface CollectionSearchProps {
  collections: CmsCollections;
  collection?: CmsCollectionState;
  searchTerm: string;
  onSubmit: (query: string, collection?: string) => void;
  t: TranslateFunction;
}

function getSelectedFromProps(props: CollectionSearchProps) {
  if (!props.collection) return -1;
  return Object.keys(props.collections).indexOf(props.collection.name);
}

function CollectionSearch(props: CollectionSearchProps) {
  const { collections, collection, searchTerm, onSubmit, t } = props;
  const [query, setQuery] = React.useState(searchTerm);
  const [suggestionsVisible, setSuggestionsVisible] = React.useState(false);
  const [selectedCollectionIdx, setSelectedCollectionIdx] = React.useState(() => getSelectedFromProps(props));

  React.useEffect(() => {
    setSelectedCollectionIdx(getSelectedFromProps({ ...props, collection }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when collection identity changes
  }, [collection]);

  function submitSearch(idx = selectedCollectionIdx) {
    setSuggestionsVisible(false);
    if (idx !== -1) {
      const selectedCollection = Object.values(collections)[idx];
      onSubmit(query, selectedCollection?.name);
    } else {
      onSubmit(query);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      submitSearch();
    }
    if (suggestionsVisible) {
      if (event.key === 'Escape') {
        setSuggestionsVisible(false);
      }
      if (event.key === 'ArrowDown') {
        setSelectedCollectionIdx(prev => Math.min(prev + 1, Object.keys(collections).length - 1));
        event.preventDefault();
      } else if (event.key === 'ArrowUp') {
        setSelectedCollectionIdx(prev => Math.max(prev - 1, -1));
        event.preventDefault();
      }
    }
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    setSuggestionsVisible(next !== '');
    if (next === '') {
      setSelectedCollectionIdx(-1);
    }
  }

  function handleSuggestionClick(event: React.MouseEvent, idx: number) {
    event.preventDefault();
    setSelectedCollectionIdx(idx);
    submitSearch(idx);
  }

  const collectionValues = Object.values(collections);
  return (
    <SearchContainer
      onBlur={() => setSuggestionsVisible(false)}
      onFocus={() => setSuggestionsVisible(query !== '')}
    >
      <InputContainer>
        <Icon type="search" />
        <SearchInput
          className="SearchInput"
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={() => setSuggestionsVisible(true)}
          placeholder={t('collection.sidebar.searchAll')}
          value={query}
        />
      </InputContainer>
      {suggestionsVisible && (
        <SuggestionsContainer className="SuggestionsContainer">
          <Suggestions>
            <SuggestionHeader>{t('collection.sidebar.searchIn')}</SuggestionHeader>
            <SuggestionItem
              $isActive={selectedCollectionIdx === -1}
              onClick={e => handleSuggestionClick(e, -1)}
              onMouseDown={e => e.preventDefault()}
            >
              {t('collection.sidebar.allCollections')}
            </SuggestionItem>
            <SuggestionDivider />
            {collectionValues.map((c: CmsCollectionState, idx: number) => (
              <SuggestionItem
                key={idx}
                $isActive={idx === selectedCollectionIdx}
                onClick={(e: any) => handleSuggestionClick(e, idx)}
                onMouseDown={e => e.preventDefault()}
              >
                {c.label}
              </SuggestionItem>
            ))}
          </Suggestions>
        </SuggestionsContainer>
      )}
    </SearchContainer>
  );
}

export default translate()(CollectionSearch);
