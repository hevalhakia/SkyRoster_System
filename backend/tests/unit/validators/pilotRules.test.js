const { validatePilotComposition } = require('../../../src/validators/pilotRules');
describe('Pilot Composition Validation', () => {
  const createPilot = (role) => ({
    id: `pilot_${Date.now()}_${Math.random()}`,
    name: `Test ${role}`,
    role,
    experience_hours: role === 'trainee' ? 500 : 2000,
    license_type: 'COMMERCIAL'
  });
  describe('Valid Pilot Compositions', () => {
    it('should accept minimum valid composition: 1 chief + 1 senior + 1 junior', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('senior'),
        createPilot('junior')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(true);
    });
    it('should accept maximum chief pilots: 2 chief + 1 senior + 0 trainee', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('chief'),
        createPilot('senior')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(true);
    });
    it('should accept maximum trainees: 1 chief + 2 senior + 2 trainee', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('senior'),
        createPilot('senior'),
        createPilot('trainee'),
        createPilot('trainee')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(true);
    });
    it('should accept mixed valid composition: 2 chief + 2 senior + 1 trainee', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('chief'),
        createPilot('senior'),
        createPilot('senior'),
        createPilot('trainee')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(true);
    });
    it('should accept multiple seniors without trainees', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('senior'),
        createPilot('senior'),
        createPilot('senior')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(true);
    });
  });
  describe('Invalid Pilot Compositions', () => {
    it('should reject zero chief pilots', () => {
      const pilots = [
        createPilot('senior'),
        createPilot('junior')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(false);
    });
    it('should reject more than 2 chief pilots', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('chief'),
        createPilot('chief'),
        createPilot('senior')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(false);
    });
    it('should reject missing senior pilots when only chiefs present', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('junior')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(false);
    });
    it('should reject more than 2 trainee pilots', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('senior'),
        createPilot('trainee'),
        createPilot('trainee'),
        createPilot('trainee')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(false);
    });
    it('should reject empty pilot array', () => {
      const pilots = [];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(false);
    });
    it('should reject composition with only trainee pilots', () => {
      const pilots = [
        createPilot('trainee'),
        createPilot('trainee')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(false);
    });
    it('should reject composition with only chief pilots', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('chief')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(false);
    });
  });
  describe('Edge Cases and Error Handling', () => {
    it('should handle null pilot array gracefully', () => {
      const pilots = null;
      expect(() => validatePilotComposition(pilots)).toThrow();
    });
    it('should handle undefined pilot array', () => {
      const pilots = undefined;
      expect(() => validatePilotComposition(pilots)).toThrow();
    });
    it('should reject pilot object without role field', () => {
      const pilots = [
        { id: 'p1', name: 'Pilot' },
        { id: 'p2', name: 'Senior', role: 'senior' }
      ];
      expect(() => validatePilotComposition(pilots)).toThrow();
    });
    it('should reject unknown pilot roles', () => {
      const pilots = [
        createPilot('chief'),
        { id: 'p2', name: 'Unknown', role: 'captain' },
        createPilot('senior')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(false);
    });
    it('should handle large pilot arrays efficiently', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('senior'),
        ...Array(50).fill(null).map(() => createPilot('junior'))
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBeDefined();
      expect(typeof result).toBe('boolean');
    });
  });
  describe('Real-world Flight Planning Scenarios', () => {
    it('should accept typical domestic short-haul crew composition', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('senior')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(true);
    });
    it('should accept typical international long-haul crew composition', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('chief'),
        createPilot('senior'),
        createPilot('senior'),
        createPilot('trainee')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(true);
    });
    it('should accept crew with replacement trainee after illness', () => {
      const pilots = [
        createPilot('chief'),
        createPilot('senior'),
        createPilot('trainee')
      ];
      const result = validatePilotComposition(pilots);
      expect(result).toBe(true);
    });
  });
});
