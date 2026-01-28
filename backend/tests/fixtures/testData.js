/**
 * TEST DATA FIXTURES
 * ==================
 * Merkezi test verisi yönetimi
 * Test dosyalarında tekrar yazmaktan kaçın
 *
 * USAGE:
 * const { createMockPilot, createMockFlight } = require('./testData');
 * const pilot = createMockPilot({ role: 'senior' });
 * const flight = createMockFlight();
 */

const jwt = require('jsonwebtoken');

// ============================================================================
// CONSTANTS & DEFAULTS
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const JWT_EXPIRY = '7d';

const PILOT_ROLES = ['chief', 'first_officer', 'senior', 'junior'];
const CABIN_CREW_ROLES = ['chief_cabin', 'flight_attendant', 'purser'];
const PASSENGER_CLASSES = ['economy', 'business', 'first'];
const USER_ROLES = ['admin', 'user', 'moderator'];

// ============================================================================
// 1. PILOT FACTORY
// ============================================================================
/**
 * Mock pilot verisi oluştur
 * @param {Object} overrides - Default değerleri override etmek için
 * @returns {Object} Pilot objesi
 *
 * USAGE:
 * const pilot = createMockPilot();
 * const seniorPilot = createMockPilot({ role: 'senior', experience: 15 });
 */
function createMockPilot(overrides = {}) {
  const defaults = {
    id: Math.floor(Math.random() * 10000),
    name: 'John Doe',
    email: 'john.doe@skyroster.com',
    role: 'chief',
    license: 'ATPL', // Airline Transport Pilot
    licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    experience: 10, // years
    totalFlightHours: 5000,
    certifications: ['ATPL', 'ICAO', 'EASA'],
    medicalExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaults, ...overrides };
}

// ============================================================================
// 2. CABIN CREW FACTORY
// ============================================================================
/**
 * Mock cabin crew verisi oluştur
 * @param {Object} overrides - Default değerleri override etmek için
 * @returns {Object} Cabin crew objesi
 *
 * USAGE:
 * const crew = createMockCabinCrew();
 * const flightAttendant = createMockCabinCrew({ role: 'flight_attendant' });
 */
function createMockCabinCrew(overrides = {}) {
  const defaults = {
    id: Math.floor(Math.random() * 10000),
    name: 'Jane Smith',
    email: 'jane.smith@skyroster.com',
    role: 'chief_cabin', // chief_cabin | flight_attendant | purser
    experience: 5, // years
    languages: ['Turkish', 'English', 'German'],
    certifications: ['CRM', 'Emergency', 'Safety'],
    medicalExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    trainingSafetyExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaults, ...overrides };
}

// ============================================================================
// 3. PASSENGER FACTORY
// ============================================================================
/**
 * Mock yolcu verisi oluştur
 * @param {Object} overrides - Default değerleri override etmek için
 * @returns {Object} Yolcu objesi
 *
 * USAGE:
 * const passenger = createMockPassenger();
 * const businessPassenger = createMockPassenger({ class: 'business', hasInfant: true });
 */
function createMockPassenger(overrides = {}) {
  const defaults = {
    id: Math.floor(Math.random() * 100000),
    name: 'Alice Brown',
    email: 'alice.brown@example.com',
    passport: 'AB1234567',
    nationality: 'US',
    bookingReference: `BK${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    class: 'economy', // economy | business | first
    seat: null, // Assigned during seat assignment
    age: 35,
    hasInfant: false,
    infantAge: null,
    specialRequirements: null, // DEAF, BLIND, WHEELCHAIR, etc.
    mealPreference: 'normal', // normal | vegetarian | vegan | kosher | halal
    baggageCount: 1,
    checkedBags: 1,
    checkedWeight: 23, // kg
    specialBaggage: null, // Musical instrument, sports equipment, etc.
    emergencyContact: {
      name: 'Bob Brown',
      phone: '+1-555-0000',
      relationship: 'Brother',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaults, ...overrides };
}

// ============================================================================
// 4. FLIGHT FACTORY
// ============================================================================
/**
 * Mock uçuş verisi oluştur
 * @param {Object} overrides - Default değerleri override etmek için
 * @returns {Object} Uçuş objesi
 *
 * USAGE:
 * const flight = createMockFlight();
 * const domesticFlight = createMockFlight({ 
 *   flightNumber: 'TK2000',
 *   departure: 'IST',
 *   arrival: 'ANK'
 * });
 */
function createMockFlight(overrides = {}) {
  const departureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
  const arrivalTime = new Date(departureTime.getTime() + 10 * 60 * 60 * 1000); // 10 hours later

  const defaults = {
    id: Math.floor(Math.random() * 10000),
    flightNumber: 'TK123',
    airline: 'Turkish Airlines',
    airlineCode: 'TK',
    aircraft: {
      type: 'Boeing 777',
      registration: 'TC-JJJ',
      capacity: 350,
    },
    departure: {
      airport: 'IST',
      airportName: 'Istanbul Airport',
      country: 'Turkey',
      scheduledTime: departureTime,
      actualTime: null,
      gate: 'A1',
      terminal: 'I',
    },
    arrival: {
      airport: 'JFK',
      airportName: 'John F. Kennedy Airport',
      country: 'USA',
      scheduledTime: arrivalTime,
      actualTime: null,
      gate: null,
      terminal: null,
    },
    status: 'SCHEDULED', // SCHEDULED | BOARDING | DEPARTED | LANDED | CANCELLED | DELAYED
    distance: 9000, // km
    flightDuration: 600, // minutes
    passengers: [],
    crew: {
      pilots: [],
      cabinCrew: [],
    },
    seats: {
      total: 350,
      economy: 280,
      business: 60,
      first: 10,
      available: 350,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaults, ...overrides };
}

// ============================================================================
// 5. SEAT MAP FACTORY
// ============================================================================
/**
 * Mock koltuk haritası oluştur
 * Layout:
 * - Business: 2x2 (rows 1-5) = 20 seats
 * - Economy: 3x3 (rows 10-30) = 210 seats
 *
 * USAGE:
 * const seatMap = createMockSeatMap();
 * // Returns: { seats, occupied, available }
 */
function createMockSeatMap() {
  const seats = {};
  let seatNumber = 1;

  // Business class: 2x2, rows 1-5 (10 rows × 2 seats = 20 seats)
  for (let row = 1; row <= 5; row++) {
    for (let col = 0; col < 2; col++) {
      const seatCode = `${row}${String.fromCharCode(65 + col)}`; // 1A, 1B, 2A, 2B, etc.
      seats[seatCode] = {
        seatNumber: seatNumber++,
        row,
        column: String.fromCharCode(65 + col),
        class: 'business',
        occupied: false,
        passengerId: null,
        seatType: 'regular', // regular | window | aisle | exit_row
        emergencyExit: row === 5, // Row 5 is emergency exit row
      };
    }
  }

  // Economy class: 3x3, rows 10-30 (210 rows × 3 seats = 630 seats)
  // Simplified: rows 10-30 (21 rows × 3 seats = 63 seats for demo)
  for (let row = 10; row <= 30; row++) {
    for (let col = 0; col < 3; col++) {
      const seatCode = `${row}${String.fromCharCode(65 + col)}`;
      seats[seatCode] = {
        seatNumber: seatNumber++,
        row,
        column: String.fromCharCode(65 + col),
        class: 'economy',
        occupied: false,
        passengerId: null,
        seatType: col === 0 || col === 2 ? 'aisle' : 'window',
      };
    }
  }

  return {
    seats,
    total: Object.keys(seats).length,
    occupied: 0,
    available: Object.keys(seats).length,
    layout: {
      business: { rows: [1, 5], columns: ['A', 'B'], total: 20 },
      economy: { rows: [10, 30], columns: ['A', 'B', 'C'], total: 63 },
    },
  };
}

// ============================================================================
// 6. JWT TOKEN FACTORY
// ============================================================================
/**
 * Test için geçerli JWT token oluştur
 * @param {String} role - User role (admin | user | moderator)
 * @param {Object} overrides - Token payload'ını override etmek için
 * @returns {String} Signed JWT token
 *
 * USAGE:
 * const adminToken = createMockJWT('admin');
 * const userToken = createMockJWT('user', { email: 'custom@example.com' });
 */
function createMockJWT(role = 'user', overrides = {}) {
  const defaultPayload = {
    id: Math.floor(Math.random() * 10000),
    email: `${role}@skyroster.com`,
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    role,
    iat: Math.floor(Date.now() / 1000),
  };

  const payload = { ...defaultPayload, ...overrides };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// ============================================================================
// 7. INVALID JWT FACTORY (FOR SECURITY TESTING)
// ============================================================================
/**
 * Invalid JWT token oluştur (security testing için)
 * @param {String} type - 'expired' | 'invalid_signature' | 'malformed'
 * @returns {String} Invalid JWT token
 *
 * USAGE:
 * const expiredToken = createInvalidJWT('expired');
 * const invalidToken = createInvalidJWT('invalid_signature');
 */
function createInvalidJWT(type = 'malformed') {
  switch (type) {
    case 'expired':
      // Create JWT with -1 hour expiry
      const payload = {
        id: 1,
        email: 'user@skyroster.com',
        role: 'user',
      };
      return jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });

    case 'invalid_signature':
      // Create JWT with different secret
      const payload2 = {
        id: 1,
        email: 'user@skyroster.com',
        role: 'user',
      };
      return jwt.sign(payload2, 'wrong-secret-key', { expiresIn: '7d' });

    case 'malformed':
      // Return obviously invalid token
      return 'not.a.valid.token.format';

    default:
      return 'invalid-token';
  }
}

// ============================================================================
// 8. ROSTER FACTORY
// ============================================================================
/**
 * Mock roster (uçuş görevlendirmesi) oluştur
 * @param {Object} overrides
 * @returns {Object} Roster objesi
 */
function createMockRoster(overrides = {}) {
  const defaults = {
    id: Math.floor(Math.random() * 10000),
    flightId: 1,
    date: new Date(),
    status: 'CREATED', // CREATED | ASSIGNED | FINALIZED | EXECUTED | COMPLETED
    pilots: [createMockPilot({ role: 'chief' }), createMockPilot({ role: 'first_officer' })],
    cabinCrew: [
      createMockCabinCrew({ role: 'chief_cabin' }),
      createMockCabinCrew({ role: 'flight_attendant' }),
    ],
    passengers: [],
    notes: 'Regular flight assignment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaults, ...overrides };
}

// ============================================================================
// 9. HELPER FUNCTIONS
// ============================================================================

/**
 * Birden çok passenger oluştur
 * @param {Number} count - Kaç passenger oluşturulacak
 * @returns {Array} Passenger array
 */
function createMultiplePassengers(count = 5) {
  return Array.from({ length: count }, (_, i) =>
    createMockPassenger({
      id: i + 1,
      name: `Passenger ${i + 1}`,
      email: `passenger${i + 1}@example.com`,
      bookingReference: `BK${String(i + 1).padStart(6, '0')}`,
    })
  );
}

/**
 * Birden çok pilot oluştur
 * @param {Number} count
 * @returns {Array} Pilot array
 */
function createMultiplePilots(count = 3) {
  const pilotRoles = ['chief', 'first_officer', 'senior', 'junior'];
  return Array.from({ length: count }, (_, i) =>
    createMockPilot({
      id: i + 1,
      name: `Pilot ${i + 1}`,
      email: `pilot${i + 1}@skyroster.com`,
      role: pilotRoles[i % pilotRoles.length],
    })
  );
}

/**
 * Birden çok cabin crew oluştur
 * @param {Number} count
 * @returns {Array} Cabin crew array
 */
function createMultipleCabinCrew(count = 5) {
  const roles = ['chief_cabin', 'flight_attendant', 'flight_attendant', 'flight_attendant', 'purser'];
  return Array.from({ length: count }, (_, i) =>
    createMockCabinCrew({
      id: i + 1,
      name: `Crew Member ${i + 1}`,
      email: `crew${i + 1}@skyroster.com`,
      role: roles[i % roles.length],
    })
  );
}

// ============================================================================
// 10. VALIDATION FIXTURES (SECURITY TESTING)
// ============================================================================

/**
 * SQL Injection payloads for testing input validation
 */
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "1' UNION SELECT * FROM users --",
  "admin' --",
  "' OR 1=1 --",
  "1'; DELETE FROM flights; --",
];

/**
 * XSS payloads for testing input validation
 */
const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(\'XSS\')">',
  '<svg onload="alert(\'XSS\')">',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<body onload="alert(\'XSS\')">',
  '<input autofocus onfocus="alert(\'XSS\')">',
];

/**
 * LDAP Injection payload
 */
const LDAP_INJECTION_PAYLOAD = 'admin*)(|(uid=*';

/**
 * Path Traversal payloads
 */
const PATH_TRAVERSAL_PAYLOADS = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '../../../sensitive/data',
];

// ============================================================================
// 11. RESPONSE TEMPLATES (FOR MOCKING API RESPONSES)
// ============================================================================

/**
 * Mock API response template
 */
const createMockResponse = (data, statusCode = 200, message = 'Success') => ({
  status: statusCode,
  message,
  data,
  timestamp: new Date(),
});

/**
 * Mock error response template
 */
const createMockErrorResponse = (statusCode = 400, message = 'Bad Request', errors = []) => ({
  status: statusCode,
  message,
  errors,
  timestamp: new Date(),
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Factory Functions
  createMockPilot,
  createMockCabinCrew,
  createMockPassenger,
  createMockFlight,
  createMockSeatMap,
  createMockJWT,
  createInvalidJWT,
  createMockRoster,

  // Helper Functions
  createMultiplePassengers,
  createMultiplePilots,
  createMultipleCabinCrew,

  // Validation Fixtures
  SQL_INJECTION_PAYLOADS,
  XSS_PAYLOADS,
  LDAP_INJECTION_PAYLOAD,
  PATH_TRAVERSAL_PAYLOADS,

  // Response Templates
  createMockResponse,
  createMockErrorResponse,

  // Constants
  PILOT_ROLES,
  CABIN_CREW_ROLES,
  PASSENGER_CLASSES,
  USER_ROLES,
  JWT_SECRET,
  JWT_EXPIRY,
};
