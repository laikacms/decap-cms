import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  EntryCard,
  CardImage,
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
} from '../EntryCard';
import { VIEW_STYLE_LIST, VIEW_STYLE_GRID } from '../../../../constants/collectionViews';

function renderWithRouter(component) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

describe('EntryCard', () => {
  function t(key) {
    const labels = {
      'editor.editorToolbar.inReview': 'In review',
      'editor.editorToolbar.ready': 'Ready',
      'editor.editorToolbar.draft': 'Draft',
    };
    return labels[key] || key;
  }

  describe('list-view rendering', () => {
    it('renders the collection label and workflow badge', () => {
      renderWithRouter(
        <EntryCard
          viewStyle={VIEW_STYLE_LIST}
          path="/collections/posts/entries/hello-world"
          summary="Hello World"
          collectionLabel="Posts"
          workflowStatus="pending_review"
          t={t}
        />,
      );

      expect(screen.getByText('Posts')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
      expect(screen.getByText('In review')).toBeInTheDocument();
    });

    it('omits the collection label and workflow badge when not provided', () => {
      renderWithRouter(
        <EntryCard
          viewStyle={VIEW_STYLE_LIST}
          path="/collections/posts/entries/hello-world"
          summary="Hello World"
          t={t}
        />,
      );

      expect(screen.queryByText('Posts')).not.toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('does not render a grid image even when one is provided', () => {
      const getAsset = jest.fn();
      renderWithRouter(
        <EntryCard
          viewStyle={VIEW_STYLE_LIST}
          path="/collections/posts/entries/hello-world"
          summary="Hello World"
          image="hero.png"
          imageField="hero"
          getAsset={getAsset}
          t={t}
        />,
      );

      expect(getAsset).not.toHaveBeenCalled();
    });
  });

  describe('grid-view rendering', () => {
    it('renders the card body with collection label and workflow badge', () => {
      renderWithRouter(
        <EntryCard
          viewStyle={VIEW_STYLE_GRID}
          path="/collections/posts/entries/hello-world"
          summary="Hello World"
          collectionLabel="Posts"
          workflowStatus="draft"
          t={t}
        />,
      );

      expect(screen.getByText('Posts')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders a CardImage when an image is provided', () => {
      const asset = { toString: () => 'blob:hero.png' };
      const getAsset = jest.fn().mockReturnValue(asset);

      const { container } = renderWithRouter(
        <EntryCard
          viewStyle={VIEW_STYLE_GRID}
          path="/collections/posts/entries/hello-world"
          summary="Hello World"
          image="hero.png"
          imageField="hero"
          getAsset={getAsset}
          t={t}
        />,
      );

      expect(getAsset).toHaveBeenCalledWith('hero.png', 'hero');
      expect(container.querySelector('a > div + div')).toBeInTheDocument();
    });

    it('does not render a CardImage when no image is provided', () => {
      const getAsset = jest.fn();
      renderWithRouter(
        <EntryCard
          viewStyle={VIEW_STYLE_GRID}
          path="/collections/posts/entries/hello-world"
          summary="Hello World"
          t={t}
        />,
      );

      expect(getAsset).not.toHaveBeenCalled();
    });
  });

  describe('CardImage', () => {
    it('resolves and renders the asset returned by getAsset', () => {
      const asset = { toString: () => 'blob:hero.png' };
      const getAsset = jest.fn().mockReturnValue(asset);

      const { container } = render(<CardImage getAsset={getAsset} value="hero.png" field="hero" />);

      expect(getAsset).toHaveBeenCalledWith('hero.png', 'hero');
      expect(container.firstChild).not.toBeNull();
    });

    it('renders nothing when value is falsy', () => {
      const getAsset = jest.fn();
      const { container } = render(
        <CardImage getAsset={getAsset} value={undefined} field="hero" />,
      );

      expect(getAsset).not.toHaveBeenCalled();
      expect(container.firstChild).toBeNull();
    });

    it('re-resolves the asset when the value dependency changes', () => {
      const assetA = { toString: () => 'blob:a.png' };
      const assetB = { toString: () => 'blob:b.png' };
      const getAsset = jest.fn(value => (value === 'a.png' ? assetA : assetB));

      const { rerender } = render(<CardImage getAsset={getAsset} value="a.png" field="hero" />);
      expect(getAsset).toHaveBeenCalledTimes(1);
      expect(getAsset).toHaveBeenLastCalledWith('a.png', 'hero');

      rerender(<CardImage getAsset={getAsset} value="b.png" field="hero" />);
      expect(getAsset).toHaveBeenCalledTimes(2);
      expect(getAsset).toHaveBeenLastCalledWith('b.png', 'hero');
    });

    it('re-resolves the asset when the field dependency changes', () => {
      const asset = { toString: () => 'blob:hero.png' };
      const getAsset = jest.fn().mockReturnValue(asset);

      const { rerender } = render(
        <CardImage getAsset={getAsset} value="hero.png" field="fieldA" />,
      );
      expect(getAsset).toHaveBeenCalledTimes(1);

      rerender(<CardImage getAsset={getAsset} value="hero.png" field="fieldB" />);
      expect(getAsset).toHaveBeenCalledTimes(2);
      expect(getAsset).toHaveBeenLastCalledWith('hero.png', 'fieldB');
    });
  });

  describe('mapStateToProps', () => {
    it('derives summary, path and image from the entry and collection', () => {
      const jestFromJS = require('immutable').fromJS;
      const collection = {
        name: 'posts',
        fields: jestFromJS([
          { name: 'title', widget: 'string' },
          { name: 'hero', widget: 'image' },
        ]),
      };
      const entry = jestFromJS({
        slug: 'hello-world',
        data: { title: 'Hello World', hero: 'my image.png' },
      });
      const state = { medias: {} };

      const result = mapStateToProps(state, {
        entry,
        inferredFields: { imageField: 'hero' },
        collection,
      });

      expect(result.path).toBe('/collections/posts/entries/hello-world');
      expect(result.image).toBe(encodeURI('my image.png'));
      expect(result.isLoadingAsset).toBe(false);
    });
  });

  describe('mapDispatchToProps / mergeProps', () => {
    it('binds getAsset via mergeProps using the bound dispatch prop', () => {
      const boundFn = jest.fn();
      const dispatchProps = { boundGetAsset: jest.fn().mockReturnValue(boundFn) };
      const stateProps = { summary: 'Hello World' };
      const ownProps = { collection: 'collection-prop', entry: 'entry-prop' };

      const result = mergeProps(stateProps, dispatchProps, ownProps);

      expect(dispatchProps.boundGetAsset).toHaveBeenCalledWith('collection-prop', 'entry-prop');
      expect(result).toEqual({
        ...stateProps,
        ...dispatchProps,
        ...ownProps,
        getAsset: boundFn,
      });
    });

    it('creates a bound getAsset dispatcher via mapDispatchToProps', () => {
      const dispatch = jest.fn();
      const { boundGetAsset } = mapDispatchToProps(dispatch);

      expect(typeof boundGetAsset).toBe('function');
    });
  });
});
