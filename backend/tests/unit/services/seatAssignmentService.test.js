const { SeatAssignmentService } = require('../../../src/services/seatAssignmentService');
describe('Seat Assignment Service', () => {
  let seatAssignmentService;
  let mockSeatRepository;
  let mockPassengerRepository;
  beforeEach(() => {
    mockSeatRepository = {
      findAvailableSeats: jest.fn(),
      getSeat: jest.fn(),
      updateSeatStatus: jest.fn(),
      getFlightSeats: jest.fn()
    };
    mockPassengerRepository = {
      getAffiliatedPassengers: jest.fn(),
      getPassengerDetails: jest.fn(),
      getPassengerPreferences: jest.fn()
    };
    seatAssignmentService = new SeatAssignmentService(
      mockSeatRepository,
      mockPassengerRepository
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('Valid Seat Assignments', () => {
    it('should assign 5 passengers to unique seats', () => {
      const passengers = [
        { id: 'p1', name: 'Alice', class: 'economy', affiliated_group_id: null },
        { id: 'p2', name: 'Bob', class: 'economy', affiliated_group_id: null },
        { id: 'p3', name: 'Charlie', class: 'economy', affiliated_group_id: null },
        { id: 'p4', name: 'David', class: 'business', affiliated_group_id: null },
        { id: 'p5', name: 'Eve', class: 'business', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['12A', '12B', '12C', '14A', '14B'],
        businessSeats: ['1A', '1B', '1C', '1D']
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue({
        economySeats: seatMap.economySeats,
        businessSeats: seatMap.businessSeats
      });
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result).toBeDefined();
      expect(result.assignments).toHaveLength(5);
      const assignedSeats = result.assignments.map(a => a.seat);
      const uniqueSeats = new Set(assignedSeats);
      expect(uniqueSeats.size).toBe(5);  // 5 unique koltuk
      expect(mockSeatRepository.updateSeatStatus).toHaveBeenCalledTimes(5);
    });
    it('should seat affiliated passengers together', () => {
      const affiliatedGroupId = 'grp1';
      const passengers = [
        { 
          id: 'p1', 
          name: 'John', 
          class: 'economy', 
          affiliated_group_id: affiliatedGroupId 
        },
        { 
          id: 'p2', 
          name: 'Jane', 
          class: 'economy', 
          affiliated_group_id: affiliatedGroupId 
        }
      ];
      const seatMap = {
        economySeats: ['12A', '12B', '12C', '14A'],
        businessSeats: []
      };
      mockPassengerRepository.getAffiliatedPassengers.mockReturnValue({
        [affiliatedGroupId]: ['p1', 'p2']
      });
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments).toHaveLength(2);
      const assignedSeats = result.assignments.map(a => a.seat);
      const [seat1, seat2] = assignedSeats;
      expect(Math.abs(extractSeatNumber(seat1) - extractSeatNumber(seat2))).toBeLessThanOrEqual(1);
    });
    it('should assign economy passenger only to economy seats', () => {
      const passengers = [
        { id: 'p1', name: 'Alice', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['12A', '12B'],
        businessSeats: ['1A', '1B']
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments[0].seat).toMatch(/^12/);  // Economy seatler 12 ile başlıyor
      expect(result.assignments[0].seat).not.toMatch(/^1/);  // Business seat değil
    });
    it('should assign seat to single passenger', () => {
      const passengers = [
        { id: 'p1', name: 'Solo', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['12A', '12B', '12C'],
        businessSeats: []
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].passengerId).toBe('p1');
    });
    it('should allow business passenger downgrade to economy if business full', () => {
      const passengers = [
        { id: 'p1', name: 'Business', class: 'business', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['12A', '12B'],
        businessSeats: []  // Business koltuklari bos
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments[0].seat).toMatch(/^12/);
      expect(result.canDowngrade).toBe(true);
    });
  });
  describe('Invalid Seat Assignments', () => {
    it('should throw error on double-booking same seat', () => {
      const passengers = [
        { id: 'p1', name: 'Alice', class: 'economy', affiliated_group_id: null },
        { id: 'p2', name: 'Bob', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['12A'],  // Sadece 1 koltuk
        businessSeats: []
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockImplementation((seat) => {
        if (seat === '12A') {
          throw new Error('Seat already booked');
        }
      });
      expect(() => {
        seatAssignmentService.assignSeats(passengers, seatMap);
      }).toThrow('Seat already booked');
    });
    it('should throw error when economy passenger assigned to business seat', () => {
      const passengers = [
        { id: 'p1', name: 'Economy Guy', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: [],  // Economy koltuklari bos
        businessSeats: ['1A']
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const assignmentService = new SeatAssignmentService(
        mockSeatRepository,
        mockPassengerRepository,
        { enforceClassRestriction: true }  // Strict mode
      );
      expect(() => {
        assignmentService.assignSeats(passengers, seatMap);
      }).toThrow('Economy passenger cannot be assigned to business seat');
    });
    it('should throw error when flight is fully booked', () => {
      const passengers = [
        { id: 'p1', name: 'New Passenger', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: [],  // Ekonomi bos
        businessSeats: []   // Business bos
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      expect(() => {
        seatAssignmentService.assignSeats(passengers, seatMap);
      }).toThrow('No available seats for passenger assignment');
    });
    it('should reject null or invalid passenger data', () => {
      const passengers = [null];  // Invalid passenger
      const seatMap = {
        economySeats: ['12A'],
        businessSeats: []
      };
      expect(() => {
        seatAssignmentService.assignSeats(passengers, seatMap);
      }).toThrow();
    });
    it('should reject invalid seat format', () => {
      const passengers = [
        { id: 'p1', name: 'Alice', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['INVALID_SEAT', 'XYZ'],
        businessSeats: []
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      expect(() => {
        seatAssignmentService.assignSeats(passengers, seatMap);
      }).toThrow('Invalid seat format');
    });
  });
  describe('Seat Availability Check', () => {
    it('should return true for available seat', () => {
      const seat = '12A';
      mockSeatRepository.getSeat.mockResolvedValue({
        seatId: '12A',
        status: 'available'
      });
      const isAvailable = seatAssignmentService.checkSeatAvailability(seat);
      expect(isAvailable).toBe(true);
    });
    it('should return false for occupied seat', () => {
      const seat = '12A';
      mockSeatRepository.getSeat.mockResolvedValue({
        seatId: '12A',
        status: 'booked',
        passengerId: 'p1'
      });
      const isAvailable = seatAssignmentService.checkSeatAvailability(seat);
      expect(isAvailable).toBe(false);
    });
    it('should return false for seat in maintenance', () => {
      const seat = '1A';
      mockSeatRepository.getSeat.mockResolvedValue({
        seatId: '1A',
        status: 'maintenance'
      });
      const isAvailable = seatAssignmentService.checkSeatAvailability(seat);
      expect(isAvailable).toBe(false);
    });
    it('should throw error for non-existent seat', () => {
      const seat = 'INVALID';
      mockSeatRepository.getSeat.mockResolvedValue(null);
      expect(() => {
        seatAssignmentService.checkSeatAvailability(seat);
      }).toThrow('Seat not found');
    });
  });
  describe('Class Restriction Validation', () => {
    it('should allow economy passenger in economy seat', () => {
      const passenger = { class: 'economy' };
      const seat = { class: 'economy' };
      const isAllowed = seatAssignmentService.validateClassRestriction(passenger, seat);
      expect(isAllowed).toBe(true);
    });
    it('should allow business passenger in business seat', () => {
      const passenger = { class: 'business' };
      const seat = { class: 'business' };
      const isAllowed = seatAssignmentService.validateClassRestriction(passenger, seat);
      expect(isAllowed).toBe(true);
    });
    it('should prevent economy passenger in business seat', () => {
      const passenger = { class: 'economy' };
      const seat = { class: 'business' };
      const isAllowed = seatAssignmentService.validateClassRestriction(passenger, seat);
      expect(isAllowed).toBe(false);
    });
    it('should allow business passenger downgrade to economy', () => {
      const passenger = { class: 'business' };
      const seat = { class: 'economy' };
      const isAllowed = seatAssignmentService.validateClassRestriction(
        passenger,
        seat,
        { allowDowngrade: true }
      );
      expect(isAllowed).toBe(true);
    });
  });
  describe('Affiliated Passenger Grouping', () => {
    it('should group 3 affiliated passengers in consecutive seats', () => {
      const affiliatedGroupId = 'friends1';
      const passengers = [
        { id: 'p1', affiliated_group_id: affiliatedGroupId },
        { id: 'p2', affiliated_group_id: affiliatedGroupId },
        { id: 'p3', affiliated_group_id: affiliatedGroupId }
      ];
      const seatMap = {
        economySeats: ['12A', '12B', '12C', '14A'],
        businessSeats: []
      };
      mockPassengerRepository.getAffiliatedPassengers.mockReturnValue({
        [affiliatedGroupId]: ['p1', 'p2', 'p3']
      });
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      const assignedSeats = result.assignments.map(a => a.seat);
      expect(assignedSeats).toEqual(['12A', '12B', '12C']);
    });
    it('should assign nearby seats when exact consecutive not available', () => {
      const affiliatedGroupId = 'family1';
      const passengers = [
        { id: 'p1', affiliated_group_id: affiliatedGroupId },
        { id: 'p2', affiliated_group_id: affiliatedGroupId }
      ];
      const seatMap = {
        economySeats: ['12A', '12C', '12D'],  // 12B eksik
        businessSeats: []
      };
      mockPassengerRepository.getAffiliatedPassengers.mockReturnValue({
        [affiliatedGroupId]: ['p1', 'p2']
      });
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments).toHaveLength(2);
      expect(result.groupDistanceOptimized).toBe(true);
    });
  });
  describe('Boundary Value Analysis', () => {
    it('should handle 1 passenger 1 seat case', () => {
      const passengers = [
        { id: 'p1', name: 'Solo', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['12A'],
        businessSeats: []
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].passengerId).toBe('p1');
    });
    it('should assign all passengers when exact seat count matches', () => {
      const passengers = [
        { id: 'p1', name: 'A', class: 'economy', affiliated_group_id: null },
        { id: 'p2', name: 'B', class: 'economy', affiliated_group_id: null },
        { id: 'p3', name: 'C', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['12A', '12B', '12C'],
        businessSeats: []
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments).toHaveLength(3);
      expect(result.unassignedPassengers).toHaveLength(0);
    });
    it('should handle more passengers than seats', () => {
      const passengers = [
        { id: 'p1', name: 'A', class: 'economy', affiliated_group_id: null },
        { id: 'p2', name: 'B', class: 'economy', affiliated_group_id: null },
        { id: 'p3', name: 'C', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['12A', '12B'],  // 2 koltuk, 3 yolcu
        businessSeats: []
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments).toHaveLength(2);
      expect(result.unassignedPassengers).toHaveLength(1);
    });
    it('should handle assignment to last available seat', () => {
      const passengers = [
        { id: 'p1', name: 'Last', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['14D'],  // Son koltuk
        businessSeats: []
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments[0].seat).toBe('14D');
    });
  });
  describe('Error Scenarios and Special Cases', () => {
    it('should handle repository error gracefully', async () => {
      const passengers = [
        { id: 'p1', name: 'Alice', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: ['12A'],
        businessSeats: []
      };
      mockSeatRepository.getFlightSeats.mockRejectedValue(
        new Error('Database connection failed')
      );
      try {
        await seatAssignmentService.assignSeats(passengers, seatMap);
        fail('Should throw error');
      } catch (error) {
        expect(error.message).toContain('Database connection failed');
      }
    });
    it('should handle empty passenger list', () => {
      const passengers = [];
      const seatMap = {
        economySeats: ['12A', '12B'],
        businessSeats: []
      };
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      expect(result.assignments).toHaveLength(0);
    });
    it('should handle empty seat map', () => {
      const passengers = [
        { id: 'p1', name: 'Alice', class: 'economy', affiliated_group_id: null }
      ];
      const seatMap = {
        economySeats: [],
        businessSeats: []
      };
      expect(() => {
        seatAssignmentService.assignSeats(passengers, seatMap);
      }).toThrow('No available seats');
    });
    it('should perform bulk assignment efficiently', () => {
      const passengers = Array(100).fill(null).map((_, i) => ({
        id: `p${i}`,
        name: `Passenger ${i}`,
        class: 'economy',
        affiliated_group_id: null
      }));
      const seatMap = {
        economySeats: Array(100).fill(null).map((_, i) => `${20 + Math.floor(i/6)}${String.fromCharCode(65 + (i % 6))}`),
        businessSeats: []
      };
      mockSeatRepository.getFlightSeats.mockResolvedValue(seatMap);
      mockSeatRepository.updateSeatStatus.mockResolvedValue(true);
      const startTime = Date.now();
      const result = seatAssignmentService.assignSeats(passengers, seatMap);
      const endTime = Date.now();
      expect(result.assignments).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000);  // 1 saniyeden az
    });
  });
});
function extractSeatNumber(seat) {
  return parseInt(seat.match(/\d+/)[0]);
}
