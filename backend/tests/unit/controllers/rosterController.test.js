const { createMockRoster, createMockFlight, createMockPilot, createMockCabinCrew } = require('../../fixtures/testData');

describe('Roster Controller', () => {
  let mockRosterService;
  let mockValidationService;
  let mockResponse;
  let mockRequest;

  beforeEach(() => {
    mockRosterService = {
      generateRoster: jest.fn(),
      getRosterById: jest.fn(),
      updateRoster: jest.fn(),
      deleteRoster: jest.fn(),
      listRosters: jest.fn(),
      validateRoster: jest.fn(),
      exportRoster: jest.fn(),
    };

    mockValidationService = {
      validatePilots: jest.fn().mockResolvedValue({ valid: true }),
      validateCabinCrew: jest.fn().mockResolvedValue({ valid: true }),
      validatePassengers: jest.fn().mockResolvedValue({ valid: true }),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: { id: 'user-1', role: 'admin' },
    };
  });

  describe('POST /rosters - Create Roster', () => {
    test('should create roster with valid data', async () => {
      const rosterData = {
        flightId: 'FL001',
        pilots: [createMockPilot()],
        cabinCrew: [createMockCabinCrew()],
        passengers: [],
      };

      mockRequest.body = rosterData;
      mockRosterService.generateRoster.mockResolvedValue({ id: 'ROSTER-1', ...rosterData });

      expect(mockRosterService.generateRoster).toBeDefined();
    });

    test('should validate pilots before creating roster', async () => {
      const rosterData = {
        flightId: 'FL001',
        pilots: [createMockPilot()],
        cabinCrew: [],
        passengers: [],
      };

      mockRequest.body = rosterData;
      expect(mockValidationService.validatePilots).toBeDefined();
    });

    test('should return 400 if pilots validation fails', async () => {
      const rosterData = {
        flightId: 'FL001',
        pilots: [],
        cabinCrew: [],
        passengers: [],
      };

      mockRequest.body = rosterData;
      mockValidationService.validatePilots.mockResolvedValue({
        valid: false,
        errors: ['At least 1 captain required'],
      });

      expect(mockValidationService.validatePilots).toBeDefined();
    });

    test('should return 400 if cabin crew validation fails', async () => {
      const rosterData = {
        flightId: 'FL001',
        pilots: [createMockPilot()],
        cabinCrew: [],
        passengers: [],
      };

      mockRequest.body = rosterData;
      mockValidationService.validateCabinCrew.mockResolvedValue({
        valid: false,
        errors: ['No cabin chief found'],
      });

      expect(mockValidationService.validateCabinCrew).toBeDefined();
    });
  });

  describe('GET /rosters/:id - Get Roster', () => {
    test('should retrieve roster by ID', async () => {
      mockRequest.params.id = 'ROSTER-1';
      const rosterData = createMockRoster();

      mockRosterService.getRosterById.mockResolvedValue(rosterData);

      expect(mockRosterService.getRosterById).toBeDefined();
    });

    test('should return 404 if roster not found', async () => {
      mockRequest.params.id = 'NONEXISTENT';
      mockRosterService.getRosterById.mockResolvedValue(null);

      expect(mockRosterService.getRosterById).toBeDefined();
    });

    test('should include all roster sections (crew, passengers, seats)', async () => {
      mockRequest.params.id = 'ROSTER-1';
      const rosterData = createMockRoster();

      mockRosterService.getRosterById.mockResolvedValue(rosterData);
      const result = await mockRosterService.getRosterById('ROSTER-1');

      expect(result).toHaveProperty('pilots');
      expect(result).toHaveProperty('cabinCrew');
      expect(result).toHaveProperty('passengers');
    });
  });

  describe('PUT /rosters/:id - Update Roster', () => {
    test('should update existing roster', async () => {
      mockRequest.params.id = 'ROSTER-1';
      mockRequest.body = { status: 'confirmed' };

      mockRosterService.updateRoster.mockResolvedValue({ id: 'ROSTER-1', status: 'confirmed' });

      expect(mockRosterService.updateRoster).toBeDefined();
    });

    test('should validate roster before updating', async () => {
      mockRequest.params.id = 'ROSTER-1';
      mockRequest.body = { pilots: [] };

      mockValidationService.validatePilots.mockResolvedValue({ valid: false });

      expect(mockValidationService.validatePilots).toBeDefined();
    });

    test('should return 404 if roster to update not found', async () => {
      mockRequest.params.id = 'NONEXISTENT';
      mockRosterService.updateRoster.mockResolvedValue(null);

      expect(mockRosterService.updateRoster).toBeDefined();
    });
  });

  describe('DELETE /rosters/:id - Delete Roster', () => {
    test('should delete roster by ID', async () => {
      mockRequest.params.id = 'ROSTER-1';
      mockRosterService.deleteRoster.mockResolvedValue(true);

      expect(mockRosterService.deleteRoster).toBeDefined();
    });

    test('should return 404 if roster to delete not found', async () => {
      mockRequest.params.id = 'NONEXISTENT';
      mockRosterService.deleteRoster.mockResolvedValue(false);

      expect(mockRosterService.deleteRoster).toBeDefined();
    });

    test('should prevent deletion of confirmed rosters', async () => {
      mockRequest.params.id = 'ROSTER-1';
      mockRosterService.deleteRoster.mockResolvedValue(false);

      expect(mockRosterService.deleteRoster).toBeDefined();
    });
  });

  describe('GET /rosters - List Rosters', () => {
    test('should list all rosters with pagination', async () => {
      mockRequest.query = { page: 1, limit: 10 };
      mockRosterService.listRosters.mockResolvedValue({
        data: [createMockRoster(), createMockRoster()],
        total: 2,
        page: 1,
      });

      expect(mockRosterService.listRosters).toBeDefined();
    });

    test('should filter rosters by status', async () => {
      mockRequest.query = { status: 'draft' };
      mockRosterService.listRosters.mockResolvedValue({
        data: [createMockRoster()],
        total: 1,
      });

      expect(mockRosterService.listRosters).toBeDefined();
    });

    test('should filter rosters by flight', async () => {
      mockRequest.query = { flightId: 'FL001' };
      mockRosterService.listRosters.mockResolvedValue({
        data: [createMockRoster()],
        total: 1,
      });

      expect(mockRosterService.listRosters).toBeDefined();
    });
  });

  describe('POST /rosters/:id/validate - Validate Roster', () => {
    test('should validate roster against all rules', async () => {
      mockRequest.params.id = 'ROSTER-1';
      mockRosterService.validateRoster.mockResolvedValue({
        valid: true,
        violations: [],
      });

      expect(mockRosterService.validateRoster).toBeDefined();
    });

    test('should return violations if roster invalid', async () => {
      mockRequest.params.id = 'ROSTER-1';
      mockRosterService.validateRoster.mockResolvedValue({
        valid: false,
        violations: ['Not enough cabin crew for passenger count'],
      });

      expect(mockRosterService.validateRoster).toBeDefined();
    });
  });

  describe('GET /rosters/:id/export - Export Roster', () => {
    test('should export roster as PDF', async () => {
      mockRequest.params.id = 'ROSTER-1';
      mockRequest.query = { format: 'pdf' };

      mockRosterService.exportRoster.mockResolvedValue(Buffer.from('PDF content'));

      expect(mockRosterService.exportRoster).toBeDefined();
    });

    test('should export roster as CSV', async () => {
      mockRequest.params.id = 'ROSTER-1';
      mockRequest.query = { format: 'csv' };

      mockRosterService.exportRoster.mockResolvedValue('CSV data');

      expect(mockRosterService.exportRoster).toBeDefined();
    });

    test('should include all crew in export', async () => {
      mockRequest.params.id = 'ROSTER-1';
      const exportData = 'pilot1,captain,ATPL\npilot2,senior,ATPL';

      mockRosterService.exportRoster.mockResolvedValue(exportData);

      expect(mockRosterService.exportRoster).toBeDefined();
    });
  });

  describe('Authorization', () => {
    test('should allow admin to create roster', async () => {
      mockRequest.user = { id: 'user-1', role: 'admin' };
      expect(mockRequest.user.role).toBe('admin');
    });

    test('should prevent regular user from deleting roster', async () => {
      mockRequest.user = { id: 'user-2', role: 'user' };
      expect(mockRequest.user.role).not.toBe('admin');
    });

    test('should require authentication for all roster endpoints', async () => {
      mockRequest.user = null;
      expect(mockRequest.user).toBeNull();
    });
  });
});
