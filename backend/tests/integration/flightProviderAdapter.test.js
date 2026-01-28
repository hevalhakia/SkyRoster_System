jest.mock('axios');
const axios = require('axios');
const { FlightProviderAdapter } = require('../../../src/adapters/flightProviderAdapter');

describe('Flight Provider Adapter - Integration Tests', () => {
  beforeAll(async () => {
    await createTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  let adapter;
  beforeEach(() => {
    adapter = new FlightProviderAdapter();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllTimers();
  });
  describe('Valid API Responses - Happy Path', () => {
    it('should map complete flight data from API to DTO correctly', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'TK123',
          departure_airport: 'IST',
          arrival_airport: 'JFK',
          aircraft_type: 'A350',
          departure_time: '2025-12-25T10:00:00Z',
          arrival_time: '2025-12-25T22:00:00Z',
          duration_minutes: 600,
          total_seats: 350,
          available_seats: 285
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      const result = await adapter.fetchFlightData('TK123');
      expect(result).toEqual({
        flightNumber: 'TK123',
        departureAirport: 'IST',
        arrivalAirport: 'JFK',
        aircraftType: 'A350',
        departureTime: '2025-12-25T10:00:00Z',
        arrivalTime: '2025-12-25T22:00:00Z',
        durationMinutes: 600,
        totalSeats: 350,
        availableSeats: 285
      });
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('TK123'),
        expect.objectContaining({
          timeout: expect.any(Number)
        })
      );
    });
    it('should handle minimal required flight data', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'SK456',
          departure_airport: 'STO',
          arrival_airport: 'CPH',
          aircraft_type: 'B737'
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      const result = await adapter.fetchFlightData('SK456');
      expect(result.flightNumber).toBe('SK456');
      expect(result.departureAirport).toBe('STO');
      expect(result.arrivalAirport).toBe('CPH');
      expect(result.aircraftType).toBe('B737');
    });
    it('should ignore extra fields not in DTO schema', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'EK789',
          departure_airport: 'DXB',
          arrival_airport: 'LHR',
          aircraft_type: 'B777',
          extra_field_1: 'should be ignored',
          random_api_field: 12345,
          internal_id: 'secret123'
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      const result = await adapter.fetchFlightData('EK789');
      expect(result).not.toHaveProperty('extra_field_1');
      expect(result).not.toHaveProperty('extraField1');
      expect(result).not.toHaveProperty('random_api_field');
      expect(result).not.toHaveProperty('randomApiField');
      expect(Object.keys(result).length).toBeLessThanOrEqual(10);
    });
    it('should handle null/undefined optional fields', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'BA123',
          departure_airport: 'LHR',
          arrival_airport: 'ORD',
          aircraft_type: 'B787',
          departure_time: null,
          duration_minutes: undefined,
          available_seats: null
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      const result = await adapter.fetchFlightData('BA123');
      expect(result.departureTime).toBeNull();
      expect(result.durationMinutes).toBeUndefined();
      expect(result.availableSeats).toBeNull();
    });
    it('should correctly map various aircraft types', async () => {
      const aircraftTypes = ['A380', 'B747', 'A350', 'B777', 'Q400'];
      for (const aircraftType of aircraftTypes) {
        const mockResponse = {
          data: {
            flight_number: `TEST-${aircraftType}`,
            departure_airport: 'AMS',
            arrival_airport: 'BJS',
            aircraft_type: aircraftType
          }
        };
        axios.get.mockResolvedValue(mockResponse);
        const result = await adapter.fetchFlightData(`TEST-${aircraftType}`);
        expect(result.aircraftType).toBe(aircraftType);
      }
    });
    it('should handle large numeric values correctly', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'A380TEST',
          departure_airport: 'JFK',
          arrival_airport: 'HND',
          aircraft_type: 'A380',
          total_seats: 853,
          available_seats: 750,
          duration_minutes: 880
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      const result = await adapter.fetchFlightData('A380TEST');
      expect(result.totalSeats).toBe(853);
      expect(result.availableSeats).toBe(750);
      expect(result.durationMinutes).toBe(880);
    });
  });
  describe('Partial Data Handling - Default Values', () => {
    it('should assign default values for missing optional fields', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'XQ999',
          departure_airport: 'BOS',
          arrival_airport: 'MIA'
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      const result = await adapter.fetchFlightData('XQ999');
      expect(result.aircraftType).toBeDefined();
      expect(result.durationMinutes).toBeDefined();
      expect(result.totalSeats).toBeDefined();
      expect(result.aircraftType).toBe('UNKNOWN');
      expect(result.durationMinutes).toBe(0);
      expect(result.totalSeats).toBe(0);
    });
    it('should preserve zero values (not treat as missing)', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'MAINTENANCE001',
          departure_airport: 'HAN',
          arrival_airport: 'SGN',
          aircraft_type: 'A320',
          available_seats: 0,
          duration_minutes: 0
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      const result = await adapter.fetchFlightData('MAINTENANCE001');
      expect(result.availableSeats).toBe(0);
      expect(result.durationMinutes).toBe(0);
    });
  });
  describe('Error Scenarios - Exception Handling', () => {
    it('should throw error on network timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      axios.get.mockRejectedValue(timeoutError);
      await expect(adapter.fetchFlightData('TIMEOUT123'))
        .rejects
        .toThrow('Request timeout');
      expect(axios.get).toHaveBeenCalled();
    });
    it('should throw error on API 500 server error', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            error: 'Database connection failed'
          }
        },
        message: 'Request failed with status code 500'
      };
      axios.get.mockRejectedValue(serverError);
      await expect(adapter.fetchFlightData('ERROR500'))
        .rejects
        .toThrow();
      expect(axios.get).toHaveBeenCalled();
    });
    it('should throw error on API 404 not found', async () => {
      const notFoundError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {
            error: 'Flight not found'
          }
        }
      };
      axios.get.mockRejectedValue(notFoundError);
      await expect(adapter.fetchFlightData('NONEXISTENT'))
        .rejects
        .toThrow();
    });
    it('should throw error on malformed JSON response', async () => {
      const malformedError = new SyntaxError('Unexpected token < in JSON at position 0');
      axios.get.mockRejectedValue(malformedError);
      await expect(adapter.fetchFlightData('MALFORMED'))
        .rejects
        .toThrow(SyntaxError);
    });
    it('should throw error when connection refused', async () => {
      const connRefusedError = new Error('connect ECONNREFUSED');
      connRefusedError.code = 'ECONNREFUSED';
      axios.get.mockRejectedValue(connRefusedError);
      await expect(adapter.fetchFlightData('CONNREFUSED'))
        .rejects
        .toThrow('connect ECONNREFUSED');
    });
    it('should throw error when response missing required fields', async () => {
      const mockApiResponse = {
        data: {
          departure_airport: 'LAX',
          aircraft_type: 'B777'
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      await expect(adapter.fetchFlightData('INVALID'))
        .rejects
        .toThrow(/flight_number|flightNumber|required/i);
    });
    it('should throw error on API 401 unauthorized', async () => {
      const unauthorizedError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {
            error: 'Invalid API key'
          }
        }
      };
      axios.get.mockRejectedValue(unauthorizedError);
      await expect(adapter.fetchFlightData('UNAUTH'))
        .rejects
        .toThrow();
    });
    it('should throw error on rate limit exceeded', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {
            error: 'Rate limit exceeded',
            retry_after: 60
          }
        }
      };
      axios.get.mockRejectedValue(rateLimitError);
      await expect(adapter.fetchFlightData('RATELIMIT'))
        .rejects
        .toThrow();
    });
  });
  describe('Data Transformation - Field Mapping', () => {
    it('should correctly convert snake_case to camelCase', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'TRANSFORM1',
          departure_airport: 'DEN',
          arrival_airport: 'PHX',
          aircraft_type: 'CRJ',
          departure_time: '2025-12-25T08:00:00Z',
          arrival_time: '2025-12-25T10:30:00Z',
          duration_minutes: 150,
          total_seats: 70,
          available_seats: 45,
          first_class_seats: 8,
          business_class_seats: 12
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      const result = await adapter.fetchFlightData('TRANSFORM1');
      expect(result).toHaveProperty('flightNumber');
      expect(result).not.toHaveProperty('flight_number');
      expect(result).toHaveProperty('departureAirport');
      expect(result).not.toHaveProperty('departure_airport');
      expect(result).toHaveProperty('aircraftType');
      expect(result).not.toHaveProperty('aircraft_type');
      expect(result).toHaveProperty('departureTime');
      expect(result).not.toHaveProperty('departure_time');
      expect(result).toHaveProperty('totalSeats');
      expect(result).not.toHaveProperty('total_seats');
      expect(result).toHaveProperty('firstClassSeats');
      expect(result).not.toHaveProperty('first_class_seats');
      expect(result).toHaveProperty('businessClassSeats');
      expect(result).not.toHaveProperty('business_class_seats');
    });
  });
  describe('Timeout and Concurrency', () => {
    it('should configure axios with timeout option', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'TIMEOUT1',
          departure_airport: 'CDG',
          arrival_airport: 'FCO',
          aircraft_type: 'A330'
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      await adapter.fetchFlightData('TIMEOUT1');
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: expect.any(Number)
        })
      );
      const callConfig = axios.get.mock.calls[0][1];
      expect(callConfig.timeout).toBeGreaterThan(0);
    });
    it('should handle multiple concurrent requests', async () => {
      const mockResponses = [
        {
          data: {
            flight_number: 'CONCURRENT1',
            departure_airport: 'AMS',
            arrival_airport: 'BCN',
            aircraft_type: 'B738'
          }
        },
        {
          data: {
            flight_number: 'CONCURRENT2',
            departure_airport: 'MAD',
            arrival_airport: 'LIS',
            aircraft_type: 'A320'
          }
        },
        {
          data: {
            flight_number: 'CONCURRENT3',
            departure_airport: 'ZRH',
            arrival_airport: 'PRG',
            aircraft_type: 'CRJ'
          }
        }
      ];
      axios.get
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);
      const [result1, result2, result3] = await Promise.all([
        adapter.fetchFlightData('CONCURRENT1'),
        adapter.fetchFlightData('CONCURRENT2'),
        adapter.fetchFlightData('CONCURRENT3')
      ]);
      expect(result1.flightNumber).toBe('CONCURRENT1');
      expect(result2.flightNumber).toBe('CONCURRENT2');
      expect(result3.flightNumber).toBe('CONCURRENT3');
      expect(axios.get).toHaveBeenCalledTimes(3);
    });
  });
  describe('Edge Cases and Special Scenarios', () => {
    it('should handle Unicode characters correctly', async () => {
      const mockApiResponse = {
        data: {
          flight_number: 'UNICODE1',
          departure_airport: 'NRT',
          arrival_airport: 'ICN',
          aircraft_type: 'B777',
          airline_name: '日本航空'
        }
      };
      axios.get.mockResolvedValue(mockApiResponse);
      const result = await adapter.fetchFlightData('UNICODE1');
      expect(result.flightNumber).toBe('UNICODE1');
      expect(result.airlineName).toBe('日本航空');
    });
    it('should handle special characters in flight number', async () => {
      const specialFlightNumbers = [
        'TK-123',
        'SK.456',
        'DL/789'
      ];
      for (const flightNum of specialFlightNumbers) {
        const mockResponse = {
          data: {
            flight_number: flightNum,
            departure_airport: 'TEST',
            arrival_airport: 'TEST',
            aircraft_type: 'B737'
          }
        };
        axios.get.mockResolvedValue(mockResponse);
        const result = await adapter.fetchFlightData(flightNum);
        expect(result.flightNumber).toBe(flightNum);
      }
    });
    it('should throw error on empty response data', async () => {
      const mockApiResponse = {
        data: {}
      };
      axios.get.mockResolvedValue(mockApiResponse);
      await expect(adapter.fetchFlightData('EMPTY'))
        .rejects
        .toThrow();
    });
  });
});
