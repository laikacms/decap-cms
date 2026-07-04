import schema from '../schema';

describe('Map widget schema', () => {
  describe('decimals', () => {
    it('should restrict decimals to integer type', () => {
      expect(schema.properties.decimals).toEqual({ type: 'integer' });
    });

    it('should reject a float value for decimals', () => {
      expect(schema.properties.decimals.type).toBe('integer');
      // A float is not a valid integer — confirm the type is not 'number'
      expect(schema.properties.decimals.type).not.toBe('number');
    });

    it('should accept an integer value for decimals', () => {
      const decimalsSchema = schema.properties.decimals;
      expect(decimalsSchema.type).toBe('integer');
      // An integer like 7 satisfies the integer constraint
      expect(Number.isInteger(7)).toBe(true);
    });
  });

  describe('type', () => {
    it('should restrict type to an enum of valid geometry types', () => {
      expect(schema.properties.type).toEqual({
        type: 'string',
        enum: ['Point', 'LineString', 'Polygon'],
      });
    });

    it('should reject a non-enum string value like "Circle"', () => {
      const { enum: validTypes } = schema.properties.type;
      expect(validTypes).not.toContain('Circle');
    });

    it('should accept "Point" as a valid type', () => {
      const { enum: validTypes } = schema.properties.type;
      expect(validTypes).toContain('Point');
    });

    it('should accept "LineString" as a valid type', () => {
      const { enum: validTypes } = schema.properties.type;
      expect(validTypes).toContain('LineString');
    });

    it('should accept "Polygon" as a valid type', () => {
      const { enum: validTypes } = schema.properties.type;
      expect(validTypes).toContain('Polygon');
    });

    it('should only allow exactly three geometry types', () => {
      const { enum: validTypes } = schema.properties.type;
      expect(validTypes).toHaveLength(3);
    });
  });

  describe('height', () => {
    it('should restrict height to string type', () => {
      expect(schema.properties.height).toEqual({ type: 'string' });
    });

    it('should accept a string value for height', () => {
      const heightSchema = schema.properties.height;
      expect(heightSchema.type).toBe('string');
      expect(typeof '400px').toBe(heightSchema.type);
    });
  });
});
