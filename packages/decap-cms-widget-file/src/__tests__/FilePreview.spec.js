import React from 'react';
import { render } from '@testing-library/react';
import { Map, List } from 'immutable';

import FilePreview from '../FilePreview';

function getAsset(value) {
  return `asset:${value}`;
}

describe('FilePreview', () => {
  describe('class prop', () => {
    it('applies class from field to the preview container', () => {
      const field = Map({ name: 'file', widget: 'file', class: 'my-class' });
      const { container } = render(
        <FilePreview value="file.pdf" getAsset={getAsset} field={field} />,
      );
      expect(container.firstChild).toHaveClass('my-class');
    });

    it('does not set a custom className when class is not defined on the field', () => {
      const field = Map({ name: 'file', widget: 'file' });
      const { container } = render(
        <FilePreview value="file.pdf" getAsset={getAsset} field={field} />,
      );
      expect(container.firstChild).not.toHaveClass('my-class');
    });

    it('renders without errors when field is not provided', () => {
      const { container } = render(<FilePreview value="file.pdf" getAsset={getAsset} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('single-file rendering', () => {
    it('renders a single link with href from getAsset', () => {
      const field = Map({ name: 'file', widget: 'file' });
      const { getAllByRole } = render(
        <FilePreview value="file.pdf" getAsset={getAsset} field={field} />,
      );
      const links = getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveTextContent('file.pdf');
      expect(links[0]).toHaveAttribute('href', 'asset:file.pdf');
    });
  });

  describe('multi-file rendering', () => {
    it('renders one link per item for an array value', () => {
      const field = Map({ name: 'files', widget: 'file', multiple: true });
      const value = ['a.pdf', 'b.pdf', 'c.pdf'];
      const { getAllByRole } = render(
        <FilePreview value={value} getAsset={getAsset} field={field} />,
      );
      const links = getAllByRole('link');
      expect(links).toHaveLength(3);
      value.forEach((path, index) => {
        expect(links[index]).toHaveTextContent(path);
        expect(links[index]).toHaveAttribute('href', `asset:${path}`);
      });
    });

    it('renders one link per item for an Immutable List value', () => {
      const field = Map({ name: 'files', widget: 'file', multiple: true });
      const value = List(['a.pdf', 'b.pdf', 'c.pdf']);
      const { getAllByRole } = render(
        <FilePreview value={value} getAsset={getAsset} field={field} />,
      );
      const links = getAllByRole('link');
      expect(links).toHaveLength(3);
      value.forEach((path, index) => {
        expect(links[index]).toHaveTextContent(path);
        expect(links[index]).toHaveAttribute('href', `asset:${path}`);
      });
    });

    it('renders no links for an empty array value', () => {
      const field = Map({ name: 'files', widget: 'file', multiple: true });
      const { container, queryAllByRole } = render(
        <FilePreview value={[]} getAsset={getAsset} field={field} />,
      );
      expect(container.firstChild).toBeInTheDocument();
      expect(queryAllByRole('link')).toHaveLength(0);
    });
  });
});
