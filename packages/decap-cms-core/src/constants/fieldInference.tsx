import React from 'react';

// Fallback fields used by `selectIdentifier` (reducers/collections.ts) to name an entry
// when a collection has no `identifier_field` configured, or its `identifier_field` names
// a field that isn't present on the entry. Checked in order: `title`, then `path`. This
// `path` fallback is not documented on decapcms.org and can surprise collections that
// happen to define a field literally named `path` (DCMS-438).
export const IDENTIFIER_FIELDS = ['title', 'path'] as const;

export const SORTABLE_FIELDS = ['title', 'date', 'author', 'description'] as const;

function TitlePreview({ value }: { value: React.ReactNode }) {
  return <h1>{value}</h1>;
}

function ShortTitlePreview({ value }: { value: React.ReactNode }) {
  return <h2>{value}</h2>;
}

function AuthorPreview({ value }: { value: React.ReactNode }) {
  return <strong>{value}</strong>;
}

export const INFERABLE_FIELDS = {
  title: {
    type: 'string',
    secondaryTypes: [],
    synonyms: ['title', 'name', 'label', 'headline', 'header'],
    defaultPreview: (value: React.ReactNode) => <TitlePreview value={value} />,
    fallbackToFirstField: true,
    showError: true,
  },
  shortTitle: {
    type: 'string',
    secondaryTypes: [],
    synonyms: ['short_title', 'shortTitle', 'short'],
    defaultPreview: (value: React.ReactNode) => <ShortTitlePreview value={value} />,
    fallbackToFirstField: false,
    showError: false,
  },
  author: {
    type: 'string',
    secondaryTypes: [],
    synonyms: ['author', 'name', 'by', 'byline', 'owner'],
    defaultPreview: (value: React.ReactNode) => <AuthorPreview value={value} />,
    fallbackToFirstField: false,
    showError: false,
  },
  date: {
    type: 'datetime',
    secondaryTypes: ['date'],
    synonyms: ['date', 'publishDate', 'publish_date'],
    defaultPreview: (value: React.ReactNode) => value,
    fallbackToFirstField: false,
    showError: false,
  },
  description: {
    type: 'string',
    secondaryTypes: ['text', 'markdown'],
    synonyms: [
      'shortDescription',
      'short_description',
      'shortdescription',
      'description',
      'intro',
      'introduction',
      'brief',
      'content',
      'biography',
      'bio',
      'summary',
    ],
    defaultPreview: (value: React.ReactNode) => value,
    fallbackToFirstField: false,
    showError: false,
  },
  image: {
    type: 'image',
    secondaryTypes: [],
    synonyms: [
      'image',
      'thumbnail',
      'thumb',
      'picture',
      'avatar',
      'photo',
      'cover',
      'hero',
      'logo',
    ],
    defaultPreview: (value: React.ReactNode) => value,
    fallbackToFirstField: false,
    showError: false,
  },
};
