import React from 'react';
import { render, screen, act } from '@testing-library/react';

import { Loader } from '../Loader';

describe('Loader', () => {
  describe('renderChild', () => {
    it('renders nothing when children is falsy', () => {
      const { container } = render(<Loader />);

      expect(container.firstChild).toBeEmptyDOMElement();
    });

    it('renders a LoaderText with the string when children is a string', () => {
      render(<Loader>Loading…</Loader>);

      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('renders the first item when children is an array', () => {
      render(<Loader>{['First', 'Second', 'Third']}</Loader>);

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.queryByText('Second')).not.toBeInTheDocument();
      expect(screen.queryByText('Third')).not.toBeInTheDocument();
    });

    it('advances currentItem on the interval without waiting 5s', () => {
      jest.useFakeTimers();

      render(<Loader>{['First', 'Second', 'Third']}</Loader>);

      expect(screen.getByText('First')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.queryByText('First')).not.toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(screen.getByText('Third')).toBeInTheDocument();

      // wraps back around to the first item
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(screen.getByText('First')).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe('componentWillUnmount', () => {
    it('clears the interval so no state update happens after unmount', () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { unmount } = render(<Loader>{['First', 'Second']}</Loader>);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      // Advancing timers after unmount must not trigger a setState-after-unmount warning.
      jest.advanceTimersByTime(20000);
      expect(errorSpy).not.toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
      errorSpy.mockRestore();
      jest.useRealTimers();
    });

    it('does not clear an interval when one was never started', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = render(<Loader>Loading…</Loader>);
      unmount();

      expect(clearIntervalSpy).not.toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });
});
