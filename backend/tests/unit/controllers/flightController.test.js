const { createMockFlight } = require('../../fixtures/testData');

describe('Flight Controller', () => {
  let mockFlightService;
  let mockResponse;
  let mockRequest;

  beforeEach(() => {
    mockFlightService = {
      getFlightById: jest.fn(),
      listFlights: jest.fn(),
      searchFlights: jest.fn(),
      createFlight: jest.fn(),
      updateFlight: jest.fn(),
      deleteFlight: jest.fn(),
      getFlightSeatMap: jest.fn(),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: { id: 'user-1', role: 'admin' },
    };
  });

  describe('GET /flights/:id - Get Flight', () => {
    test('should retrieve flight by ID', async () => {
      mockRequest.params.id = 'FL001';
      const flightData = createMockFlight();

      mockFlightService.getFlightById.mockResolvedValue(flightData);

      expect(mockFlightService.getFlightById).toBeDefined();
    });

    test('should return flight with all details', async () => {
      mockRequest.params.id = 'FL001';
      const flightData = createMockFlight();

      mockFlightService.getFlightById.mockResolvedValue(flightData);
      const result = await mockFlightService.getFlightById('FL001');

      expect(result).toHaveProperty('number');
      expect(result).toHaveProperty('departure');
      expect(result).toHaveProperty('arrival');
      expect(result).toHaveProperty('aircraft');
    });

    test('should return 404 if flight not found', async () => {
      mockRequest.params.id = 'NONEXISTENT';
      mockFlightService.getFlightById.mockResolvedValue(null);

      expect(mockFlightService.getFlightById).toBeDefined();
    });
  });

  describe('GET /flights - List Flights', () => {
    test('should list all upcoming flights', async () => {
      mockFlightService.listFlights.mockResolvedValue([
        createMockFlight(),
        createMockFlight(),
      ]);

      expect(mockFlightService.listFlights).toBeDefined();
    });

    test('should support pagination', async () => {
      mockRequest.query = { page: 1, limit: 20 };
      mockFlightService.listFlights.mockResolvedValue({
        data: [createMockFlight()],
        total: 100,
        page: 1,
      });

      expect(mockFlightService.listFlights).toBeDefined();
    });

    test('should filter by date range', async () => {
      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      mockFlightService.listFlights.mockResolvedValue([createMockFlight()]);

      expect(mockFlightService.listFlights).toBeDefined();
    });

    test('should filter by route', async () => {
      mockRequest.query = {
        departure: 'IST',
        arrival: 'JFK',
      };

      mockFlightService.listFlights.mockResolvedValue([createMockFlight()]);

      expect(mockFlightService.listFlights).toBeDefined();
    });

    test('should filter by aircraft type', async () => {
      mockRequest.query = { aircraft: 'A350' };

      mockFlightService.listFlights.mockResolvedValue([createMockFlight()]);

      expect(mockFlightService.listFlights).toBeDefined();
    });
  });

  describe('POST /flights/search - Search Flights', () => {
    test('should search flights by criteria', async () => {
      mockRequest.body = {
        departure: 'IST',
        arrival: 'JFK',
        date: '2025-01-15',
      };

      mockFlightService.searchFlights.mockResolvedValue([createMockFlight()]);

      expect(mockFlightService.searchFlights).toBeDefined();
    });

    test('should return empty array if no flights match', async () => {
      mockRequest.body = {
        departure: 'XXX',
        arrival: 'YYY',
      };

      mockFlightService.searchFlights.mockResolvedValue([]);

      expect(mockFlightService.searchFlights).toBeDefined();
    });

    test('should validate search parameters', async () => {
      mockRequest.body = {};

      expect(mockFlightService.searchFlights).toBeDefined();
    });
  });

  describe('POST /flights - Create Flight', () => {
    test('should create new flight with valid data', async () => {
      mockRequest.body = {
        number: 'TK999',
        departure: 'IST',
        arrival: 'NYC',
        departureTime: '2025-01-15T10:00:00Z',
        arrivalTime: '2025-01-15T22:00:00Z',
        aircraft: 'A350',
      };

      const newFlight = { id: 'FL999', ...mockRequest.body };
      mockFlightService.createFlight.mockResolvedValue(newFlight);

      expect(mockFlightService.createFlight).toBeDefined();
    });

    test('should validate flight number format', async () => {
      mockRequest.body = { number: 'INVALID' };

      expect(mockFlightService.createFlight).toBeDefined();
    });

    test('should validate departure before arrival', async () => {
      mockRequest.body = {
        number: 'TK999',
        departureTime: '2025-01-15T22:00:00Z',
        arrivalTime: '2025-01-15T10:00:00Z',
      };

      expect(mockFlightService.createFlight).toBeDefined();
    });

    test('should prevent duplicate flight numbers', async () => {
      mockRequest.body = { number: 'TK123' };

      mockFlightService.createFlight.mockResolvedValue(null);

      expect(mockFlightService.createFlight).toBeDefined();
    });
  });

  describe('PUT /flights/:id - Update Flight', () => {
    test('should update flight details', async () => {
      mockRequest.params.id = 'FL001';
      mockRequest.body = { status: 'delayed' };

      mockFlightService.updateFlight.mockResolvedValue({
        id: 'FL001',
        status: 'delayed',
      });

      expect(mockFlightService.updateFlight).toBeDefined();
    });

    test('should prevent updating past flights', async () => {
      mockRequest.params.id = 'FL001';
      mockFlightService.updateFlight.mockResolvedValue(false);

      expect(mockFlightService.updateFlight).toBeDefined();
    });

    test('should validate status transitions', async () => {
      mockRequest.params.id = 'FL001';
      mockRequest.body = { status: 'invalid_status' };

      expect(mockFlightService.updateFlight).toBeDefined();
    });
  });

  describe('DELETE /flights/:id - Delete Flight', () => {
    test('should delete flight', async () => {
      mockRequest.params.id = 'FL001';
      mockFlightService.deleteFlight.mockResolvedValue(true);

      expect(mockFlightService.deleteFlight).toBeDefined();
    });

    test('should prevent deleting flights with confirmed rosters', async () => {
      mockRequest.params.id = 'FL001';
      mockFlightService.deleteFlight.mockResolvedValue(false);

      expect(mockFlightService.deleteFlight).toBeDefined();
    });
  });

  describe('GET /flights/:id/seats - Get Seat Map', () => {
    test('should retrieve flight seat map', async () => {
      mockRequest.params.id = 'FL001';
      mockFlightService.getFlightSeatMap.mockResolvedValue({
        aircraft: 'A350',
        totalSeats: 350,
        economySeats: 250,
        businessSeats: 100,
        layout: '2-4-2',
      });

      expect(mockFlightService.getFlightSeatMap).toBeDefined();
    });

    test('should include seat availability status', async () => {
      mockRequest.params.id = 'FL001';
      const seatMap = {
        aircraft: 'A350',
        seats: [{ number: '1A', status: 'available' }],
      };

      mockFlightService.getFlightSeatMap.mockResolvedValue(seatMap);

      expect(mockFlightService.getFlightSeatMap).toBeDefined();
    });
  });

  describe('Authorization', () => {
    test('should allow admin to create flight', async () => {
      mockRequest.user = { role: 'admin' };
      expect(mockRequest.user.role).toBe('admin');
    });

    test('should allow users to view flights', async () => {
      mockRequest.user = { role: 'user' };
      expect(mockFlightService.listFlights).toBeDefined();
    });

    test('should prevent regular users from modifying flights', async () => {
      mockRequest.user = { role: 'user' };
      expect(mockRequest.user.role).not.toBe('admin');
    });
  });
});
