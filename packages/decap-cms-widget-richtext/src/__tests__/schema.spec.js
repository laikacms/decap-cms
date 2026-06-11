import Ajv from 'ajv';

import schema from '../schema';

const ajv = new Ajv();

function validate(data) {
  const valid = ajv.validate({ type: 'object', ...schema }, data);
  return { valid, errors: ajv.errors };
}

describe('richtext widget schema — minimal', () => {
  it('passes when minimal is true', () => {
    expect(validate({ minimal: true }).valid).toBe(true);
  });

  it('passes when minimal is false', () => {
    expect(validate({ minimal: false }).valid).toBe(true);
  });

  it('fails when minimal is a number', () => {
    expect(validate({ minimal: 1 }).valid).toBe(false);
  });
});

describe('richtext widget schema — buttons', () => {
  it('passes with valid button values', () => {
    expect(validate({ buttons: ['bold', 'italic'] }).valid).toBe(true);
  });

  it('fails with an unknown button value', () => {
    expect(validate({ buttons: ['nonexistent'] }).valid).toBe(false);
  });

  it('passes with all known button values', () => {
    const allButtons = schema.properties.buttons.items.enum;
    expect(validate({ buttons: allButtons }).valid).toBe(true);
  });
});

describe('richtext widget schema — editor_components', () => {
  it('passes with an array of strings', () => {
    expect(validate({ editor_components: ['image', 'code-block'] }).valid).toBe(true);
  });

  it('passes with an empty array', () => {
    expect(validate({ editor_components: [] }).valid).toBe(true);
  });
});

describe('richtext widget schema — modes', () => {
  it('passes with rich_text', () => {
    expect(validate({ modes: ['rich_text'] }).valid).toBe(true);
  });

  it('passes with raw', () => {
    expect(validate({ modes: ['raw'] }).valid).toBe(true);
  });

  it('passes with both modes', () => {
    expect(validate({ modes: ['rich_text', 'raw'] }).valid).toBe(true);
  });

  it('fails with an empty array (minItems: 1)', () => {
    expect(validate({ modes: [] }).valid).toBe(false);
  });

  it('fails with an unknown mode', () => {
    expect(validate({ modes: ['html'] }).valid).toBe(false);
  });
});
