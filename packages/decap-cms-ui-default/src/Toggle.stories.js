import Toggle from './Toggle';

export default {
  title: 'UI/Toggle',
  component: Toggle,
  args: {
    active: false,
  },
};

export const Off = {};

export const On = {
  args: {
    active: true,
  },
};
