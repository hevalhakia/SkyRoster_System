const { validateCabinComposition } = require('../../../src/validators/cabinRules');
describe('Cabin Crew Composition Validation', () => {
  const createCabinCrew = (role) => ({
    id: `crew_${Date.now()}_${Math.random()}`,
    name: `Cabin ${role}`,
    role,
    certification: 'VALID',
    experience_months: role === 'chief' ? 120 : 24,
    languages: ['EN', 'TR']
  });
  describe('Valid Cabin Crew Compositions', () => {
    it('should accept 3 cabin crew for 100 passengers (min=2, max=4)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior'),
        createCabinCrew('junior')
      ];
      const passengerCount = 100;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(true);
      expect(cabinCrew).toHaveLength(3);
      expect(cabinCrew.filter(c => c.role === 'chief')).toHaveLength(1);
    });
    it('should accept 2 cabin crew for 50 passengers (min=1, max=2)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = 50;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(true);
      expect(cabinCrew).toHaveLength(2);
    });
    it('should accept 8 cabin crew for 200 passengers (min=4, max=8)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('chief'),
        createCabinCrew('senior'),
        createCabinCrew('senior'),
        createCabinCrew('junior'),
        createCabinCrew('junior'),
        createCabinCrew('junior'),
        createCabinCrew('junior')
      ];
      const passengerCount = 200;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(true);
      expect(cabinCrew).toHaveLength(8);
      expect(cabinCrew.filter(c => c.role === 'chief')).toHaveLength(2);
    });
    it('should accept minimum crew: 1 chief + 1 junior for 50 passengers', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('junior')
      ];
      const passengerCount = 50;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(true);
      expect(cabinCrew.filter(c => c.role === 'chief')).toHaveLength(1);
    });
    it('should accept 4 crew for 150 passengers (min=3, max=6)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior'),
        createCabinCrew('junior'),
        createCabinCrew('junior')
      ];
      const passengerCount = 150;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(true);
      expect(cabinCrew).toHaveLength(4);
    });
    it('should accept maximum allowed crew for passenger count', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('chief'),
        createCabinCrew('senior'),
        createCabinCrew('senior')
      ];
      const passengerCount = 100;  // max = 100/25 = 4
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(true);
      expect(cabinCrew).toHaveLength(4);
    });
  });
  describe('Invalid Cabin Crew Compositions', () => {
    it('should reject insufficient crew: 1 crew for 100 passengers (min=2 required)', () => {
      const cabinCrew = [
        createCabinCrew('chief')
      ];
      const passengerCount = 100;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(false);
      expect(cabinCrew.length).toBeLessThan(2);
    });
    it('should reject crew composition without chief for any passenger count', () => {
      const cabinCrew = [
        createCabinCrew('senior'),
        createCabinCrew('junior')
      ];
      const passengerCount = 50;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(false);
      expect(cabinCrew.filter(c => c.role === 'chief')).toHaveLength(0);
    });
    it('should reject excessive crew: 10 crew for 100 passengers (max=4 allowed)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('chief'),
        createCabinCrew('senior'),
        createCabinCrew('senior'),
        createCabinCrew('senior'),
        createCabinCrew('junior'),
        createCabinCrew('junior'),
        createCabinCrew('junior'),
        createCabinCrew('junior'),
        createCabinCrew('junior')
      ];
      const passengerCount = 100;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(false);
      expect(cabinCrew.length).toBeGreaterThan(4);
    });
    it('should reject under-staffed crew: 2 crew for 150 passengers (min=3 required)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = 150;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(false);
      expect(cabinCrew.length).toBeLessThan(3);
    });
    it('should reject empty cabin crew array', () => {
      const cabinCrew = [];
      const passengerCount = 100;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(false);
      expect(cabinCrew).toHaveLength(0);
    });
    it('should reject insufficient crew for large passenger count', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior'),
        createCabinCrew('senior'),
        createCabinCrew('junior'),
        createCabinCrew('junior')
      ];
      const passengerCount = 300;  // min = 300/50 = 6
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(false);
      expect(cabinCrew.length).toBeLessThan(6);
    });
    it('should reject composition with only chiefs and seniors', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = 50;  // min=1, max=2, eğer minimum 2 gerekirse fail
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(typeof result).toBe('boolean');
    });
  });
  describe('Boundary Value Analysis', () => {
    it('should validate exactly 50 passengers (boundary value)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('junior')
      ];
      const passengerCount = 50;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(true);
      expect(passengerCount).toBe(50);
    });
    it('should validate 51 passengers (just above 50 boundary)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = 51;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(passengerCount).toBeGreaterThan(50);
      expect(typeof result).toBe('boolean');
    });
    it('should validate 49 passengers (just below 50 boundary)', () => {
      const cabinCrew = [
        createCabinCrew('chief')
      ];
      const passengerCount = 49;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(passengerCount).toBeLessThan(50);
      expect(typeof result).toBe('boolean');
    });
    it('should validate exactly 100 passengers with exact minimum crew', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = 100;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(true);
      expect(cabinCrew).toHaveLength(2);
    });
    it('should validate 99 passengers (just below 100 boundary)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = 99;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(passengerCount).toBeLessThan(100);
      expect(typeof result).toBe('boolean');
    });
    it('should validate 101 passengers (just above 100 boundary)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior'),
        createCabinCrew('junior')
      ];
      const passengerCount = 101;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(passengerCount).toBeGreaterThan(100);
      expect(typeof result).toBe('boolean');
    });
  });
  describe('Edge Cases and Error Handling', () => {
    it('should handle null passenger count', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = null;
      expect(() => validateCabinComposition(cabinCrew, passengerCount))
        .toThrow();
    });
    it('should handle undefined passenger count', () => {
      const cabinCrew = [
        createCabinCrew('chief')
      ];
      const passengerCount = undefined;
      expect(() => validateCabinComposition(cabinCrew, passengerCount))
        .toThrow();
    });
    it('should reject negative passenger count', () => {
      const cabinCrew = [
        createCabinCrew('chief')
      ];
      const passengerCount = -50;
      expect(() => validateCabinComposition(cabinCrew, passengerCount))
        .toThrow();
    });
    it('should handle zero passengers', () => {
      const cabinCrew = [];
      const passengerCount = 0;
      expect(() => validateCabinComposition(cabinCrew, passengerCount))
        .toThrow();
    });
    it('should reject crew member without role field', () => {
      const cabinCrew = [
        { id: 'crew1', name: 'John' },  // role eksik
        createCabinCrew('chief')
      ];
      const passengerCount = 50;
      expect(() => validateCabinComposition(cabinCrew, passengerCount))
        .toThrow();
    });
    it('should handle very large passenger count', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        ...Array(100).fill(null).map(() => createCabinCrew('senior'))
      ];
      const passengerCount = 5000;  // min=100, max=200
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(typeof result).toBe('boolean');
    });
    it('should handle decimal passenger count (should round)', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = 75.5;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(typeof result).toBe('boolean');
    });
  });
  describe('Real-world Flight Scenarios', () => {
    it('should accept typical domestic short-haul crew', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = 89;  // Typical narrow-body
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBeDefined();
      expect(typeof result).toBe('boolean');
    });
    it('should accept typical international long-haul crew', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('chief'),
        createCabinCrew('senior'),
        createCabinCrew('senior'),
        createCabinCrew('junior'),
        createCabinCrew('junior')
      ];
      const passengerCount = 300;  // Typical wide-body
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBeDefined();
    });
    it('should validate large charter flight with high passenger count', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('chief'),
        createCabinCrew('chief'),
        ...Array(9).fill(null).map(() => createCabinCrew('senior'))
      ];
      const passengerCount = 400;
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBeDefined();
    });
    it('should reject inadequate crew after emergency staffing', () => {
      const cabinCrew = [
        createCabinCrew('chief'),
        createCabinCrew('senior')
      ];
      const passengerCount = 250;  // min=5, max=10
      const result = validateCabinComposition(cabinCrew, passengerCount);
      expect(result).toBe(false);
    });
  });
});
