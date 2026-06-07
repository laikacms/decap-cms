import FieldLabel from './FieldLabel';

export default {
  title: 'UI/FieldLabel',
  component: FieldLabel,
  args: {
    children: 'Field label',
  },
};

export const Default = {};

export const Active = {
  args: {
    isActive: true,
  },
};

export const HasErrors = {
  args: {
    hasErrors: true,
  },
};
