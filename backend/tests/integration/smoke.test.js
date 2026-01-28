/**
 * SkyRoster Smoke Test Suite
 * 
 * Purpose: Full end-to-end workflow verification
 * 
 * Workflow:
 * 1. Authenticate user (login)
 * 2. Search/List flights
 * 3. Generate roster for a flight
 * 4. Assign cabin crew to roster
 * 5. Assign passengers to seats
 * 6. Save and export manifest
 * 
 * This is a critical regression test for core functionality
 */

const request = require('supertest');
const app = require('../../index.js'); // Assumes app is exported

describe('SkyRoster Smoke Test - Full Workflow', () => {
  let authToken = null;
  let userId = null;
  let flightId = 1; // Use existing test flight
  let rosterId = null;

  /**
   * Phase 1: Authentication
   */
  describe('Phase 1: Authentication', () => {
    it('should successfully login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'captain@skyroster.test',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');

      authToken = res.body.token;
      userId = res.body.user.id;
    });

    it('should validate token in subsequent requests', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', userId);
    });
  });

  /**
   * Phase 2: Flight Search & Retrieval
   */
  describe('Phase 2: Flight Operations', () => {
    it('should retrieve list of available flights', async () => {
      const res = await request(app)
        .get('/api/flights')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Store first flight for subsequent tests
      flightId = res.body[0].id;
    });

    it('should retrieve specific flight details', async () => {
      const res = await request(app)
        .get(`/api/flights/${flightId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', flightId);
      expect(res.body).toHaveProperty('flightNumber');
      expect(res.body).toHaveProperty('aircraftId');
      expect(res.body).toHaveProperty('departureTime');
      expect(res.body).toHaveProperty('arrivalTime');
    });
  });

  /**
   * Phase 3: Roster Generation
   */
  describe('Phase 3: Roster Generation', () => {
    it('should generate roster for flight', async () => {
      const res = await request(app)
        .post('/api/roster/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          flightId,
          cabinCrewCount: 4,
          minExperience: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('flightId', flightId);
      expect(res.body).toHaveProperty('crew');
      expect(Array.isArray(res.body.crew)).toBe(true);

      rosterId = res.body.id;
    });

    it('should retrieve generated roster', async () => {
      const res = await request(app)
        .get(`/api/roster/${rosterId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', rosterId);
      expect(res.body).toHaveProperty('flightId', flightId);
      expect(res.body).toHaveProperty('crew');
    });
  });

  /**
   * Phase 4: Cabin Crew Assignment
   */
  describe('Phase 4: Cabin Crew Assignment', () => {
    it('should assign cabin crew members to roster', async () => {
      const res = await request(app)
        .put(`/api/roster/${rosterId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cabinCrewIds: [1, 2, 3, 4],
          status: 'CONFIRMED',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('crew');
      expect(res.body.crew.length).toBe(4);
    });

    it('should validate crew assignments', async () => {
      const res = await request(app)
        .get(`/api/roster/${rosterId}/validate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isValid');
      expect(res.body.isValid).toBe(true);
    });
  });

  /**
   * Phase 5: Passenger & Seat Assignment
   */
  describe('Phase 5: Seat Assignment', () => {
    let passengerIds = [];

    it('should retrieve passengers for flight', async () => {
      const res = await request(app)
        .get(`/api/flights/${flightId}/passengers`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      passengerIds = res.body.slice(0, 10).map(p => p.id);
    });

    it('should assign passengers to seats', async () => {
      const seatAssignments = passengerIds.map((passengerId, index) => ({
        passengerId,
        seatNumber: String.fromCharCode(65 + Math.floor(index / 3)) + (index % 3 + 1),
        rowNumber: Math.floor(index / 3) + 1,
      }));

      const res = await request(app)
        .post(`/api/flights/${flightId}/assign-seats`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ assignments: seatAssignments });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('assignedCount');
      expect(res.body.assignedCount).toBeGreaterThan(0);
    });

    it('should retrieve seat manifest', async () => {
      const res = await request(app)
        .get(`/api/flights/${flightId}/manifest`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('flightNumber');
      expect(res.body).toHaveProperty('passengers');
      expect(Array.isArray(res.body.passengers)).toBe(true);
    });
  });

  /**
   * Phase 6: Manifest Export
   */
  describe('Phase 6: Manifest Export & Finalization', () => {
    it('should export flight manifest as JSON', async () => {
      const res = await request(app)
        .get(`/api/flights/${flightId}/manifest/export?format=json`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.type).toMatch(/json/);
    });

    it('should export flight manifest as PDF', async () => {
      const res = await request(app)
        .get(`/api/flights/${flightId}/manifest/export?format=pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.type).toMatch(/pdf/);
    });

    it('should finalize flight roster', async () => {
      const res = await request(app)
        .post(`/api/roster/${rosterId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Smoke test finalization' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'FINALIZED');
    });
  });

  /**
   * Phase 7: Logout
   */
  describe('Phase 7: Session Cleanup', () => {
    it('should successfully logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject requests after logout', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(401);
    });
  });
});
