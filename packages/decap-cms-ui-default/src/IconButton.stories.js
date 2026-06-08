import IconButton from './IconButton';

export default {
  title: 'UI/IconButton',
  component: IconButton,
  args: {
    type: 'settings',
    size: 'large',
    isActive: false,
    title: 'Settings',
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['small', 'large'],
    },
  },
};

export const Default = {};

export const Small = {
  args: {
    size: 'small',
    type: 'close',
    title: 'Close',
  },
};

export const Active = {
  args: {
    isActive: true,
  },
};
