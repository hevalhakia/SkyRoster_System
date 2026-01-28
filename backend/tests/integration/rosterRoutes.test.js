const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../../index');
const { pool } = require('../../../src/db/connection');
const { createTestUser, seedTestData, cleanupTestDatabase } = require('../../fixtures/testData');
function generateJWTToken(userId, role = 'user') {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET_TEST || 'test-secret',
    { expiresIn: '1h' }
  );
}
function generateAdminToken() {
  return generateJWTToken(1, 'admin');
}
function generateUserToken(userId = 2) {
  return generateJWTToken(userId, 'user');
}
describe('Roster Routes - API Integration Tests', () => {
  let testUserId;
  let testAdminId;
  let testRosterId;
  let validToken;
  let adminToken;
  beforeAll(async () => {
    try {
      const connection = await pool.getConnection();
      await connection.release();
      testAdminId = await createTestUser({
        email: 'admin@test.com',
        password: 'test123',
        role: 'admin'
      });
      testUserId = await createTestUser({
        email: 'user@test.com',
        password: 'test123',
        role: 'user'
      });
      await seedTestData();
      validToken = generateUserToken(testUserId);
      adminToken = generateAdminToken();
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.error('❌ Test setup failed:', error);
      throw error;
    }
  });
  afterAll(async () => {
    try {
      await cleanupTestDatabase();
      await pool.end();
      console.log('✅ Test database cleanup complete');
    } catch (error) {
      console.error('❌ Test cleanup failed:', error);
    }
  });
  describe('POST /api/rosters - Create Roster', () => {
    it('should create roster with valid data and return 201', async () => {
      const rosterData = {
        flightNumber: 'SK1001',
        departureTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 gün sonra
        aircraftType: 'Boeing 737',
        pilots: [
          { id: 1, role: 'chief' },
          { id: 2, role: 'senior' }
        ],
        cabinCrew: [
          { id: 3, role: 'chief' },
          { id: 4, role: 'senior' }
        ],
        passengers: [
          { id: 100, name: 'John Doe', class: 'economy' },
          { id: 101, name: 'Jane Smith', class: 'business' }
        ]
      };
      const res = await request(app)
        .post('/api/rosters')
        .set('Authorization', `Bearer ${validToken}`)
        .send(rosterData);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.flightNumber).toBe('SK1001');
      expect(res.body.status).toBe('pending');  // Yeni roster pending status'unda
      expect(res.body.pilots).toHaveLength(2);
      expect(res.body.cabinCrew).toHaveLength(2);
      testRosterId = res.body.id;
    });
    it('should return 401 when no auth token provided', async () => {
      const rosterData = {
        flightNumber: 'SK1002',
        departureTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        aircraftType: 'Boeing 737',
        pilots: [{ id: 1, role: 'chief' }],
        cabinCrew: [{ id: 3, role: 'chief' }]
      };
      const res = await request(app)
        .post('/api/rosters')
        .send(rosterData);
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Unauthorized');
    });
    it('should return 401 with invalid/expired token', async () => {
      const rosterData = {
        flightNumber: 'SK1003',
        departureTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pilots: [{ id: 1, role: 'chief' }],
        cabinCrew: [{ id: 3, role: 'chief' }]
      };
      const res = await request(app)
        .post('/api/rosters')
        .set('Authorization', 'Bearer invalid-token-xyz')
        .send(rosterData);
      expect(res.status).toBe(401);
    });
    it('should return 400 with validation errors for missing required fields', async () => {
      const invalidData = {
        departureTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pilots: [{ id: 1, role: 'chief' }],
        cabinCrew: [{ id: 3, role: 'chief' }]
      };
      const res = await request(app)
        .post('/api/rosters')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors[0]).toContain('flightNumber');
    });
    it('should return 400 when pilot crew does not meet minimum requirements', async () => {
      const invalidData = {
        flightNumber: 'SK1004',
        departureTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        aircraftType: 'Boeing 737',
        pilots: [],  // Pilot yok - INVALID
        cabinCrew: [{ id: 3, role: 'chief' }, { id: 4, role: 'senior' }]
      };
      const res = await request(app)
        .post('/api/rosters')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.errors).toContain(expect.stringMatching(/pilot/i));
    });
    it('should return 400 when departure time is in the past', async () => {
      const invalidData = {
        flightNumber: 'SK1005',
        departureTime: '2020-12-25T10:00:00Z',  // Geçmiş
        aircraftType: 'Boeing 737',
        pilots: [{ id: 1, role: 'chief' }],
        cabinCrew: [{ id: 3, role: 'chief' }]
      };
      const res = await request(app)
        .post('/api/rosters')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('past');
    });
    it('should return 400 for duplicate flight number', async () => {
      const firstData = {
        flightNumber: 'SK1006',
        departureTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        aircraftType: 'Boeing 737',
        pilots: [{ id: 1, role: 'chief' }],
        cabinCrew: [{ id: 3, role: 'chief' }]
      };
      await request(app)
        .post('/api/rosters')
        .set('Authorization', `Bearer ${validToken}`)
        .send(firstData);
      const secondData = { ...firstData };
      const res = await request(app)
        .post('/api/rosters')
        .set('Authorization', `Bearer ${validToken}`)
        .send(secondData);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('duplicate');
    });
  });
  describe('GET /api/rosters/:id - Get Roster', () => {
    it('should return roster details for valid ID with 200', async () => {
      const rosterId = testRosterId;
      const res = await request(app)
        .get(`/api/rosters/${rosterId}`)
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(rosterId);
      expect(res.body.flightNumber).toBeDefined();
      expect(res.body.pilots).toBeDefined();
      expect(res.body.cabinCrew).toBeDefined();
      expect(res.body.seatAssignments).toBeDefined();
      expect(Array.isArray(res.body.pilots)).toBe(true);
      expect(Array.isArray(res.body.cabinCrew)).toBe(true);
    });
    it('should return 404 for non-existent roster', async () => {
      const nonExistentId = 99999;
      const res = await request(app)
        .get(`/api/rosters/${nonExistentId}`)
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });
    it('should return 401 when no authentication provided', async () => {
      const res = await request(app)
        .get(`/api/rosters/${testRosterId}`);
      expect(res.status).toBe(401);
    });
    it('should return 400 for invalid roster ID format', async () => {
      const res = await request(app)
        .get('/api/rosters/abc-invalid')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('invalid');
    });
  });
  describe('PUT /api/rosters/:id/assign-seats - Assign Seats', () => {
    it('should assign seats and return 200 with updated roster', async () => {
      const seatAssignmentData = {
        seatAssignments: [
          { passengerId: 100, seat: '12A', class: 'economy' },
          { passengerId: 101, seat: '1A', class: 'business' }
        ]
      };
      const res = await request(app)
        .put(`/api/rosters/${testRosterId}/assign-seats`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(seatAssignmentData);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testRosterId);
      expect(res.body.seatAssignments).toHaveLength(2);
      expect(res.body.seatAssignments[0].seat).toBe('12A');
      expect(res.body.seatAssignments[1].seat).toBe('1A');
    });
    it('should return 400 when duplicate seat assignment detected', async () => {
      const invalidAssignment = {
        seatAssignments: [
          { passengerId: 100, seat: '12A', class: 'economy' },
          { passengerId: 101, seat: '12A', class: 'economy' }  // DUPLICATE
        ]
      };
      const res = await request(app)
        .put(`/api/rosters/${testRosterId}/assign-seats`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidAssignment);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('duplicate');
    });
    it('should return 400 when economy passenger assigned to business seat', async () => {
      const invalidAssignment = {
        seatAssignments: [
          { passengerId: 100, seat: '1A', class: 'business' }  // Economy yolcu ama business koltuk
        ]
      };
      const res = await request(app)
        .put(`/api/rosters/${testRosterId}/assign-seats`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidAssignment);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('class restriction');
    });
    it('should return 404 for non-existent roster', async () => {
      const seatData = {
        seatAssignments: [{ passengerId: 100, seat: '12A' }]
      };
      const res = await request(app)
        .put('/api/rosters/99999/assign-seats')
        .set('Authorization', `Bearer ${validToken}`)
        .send(seatData);
      expect(res.status).toBe(404);
    });
  });
  describe('DELETE /api/rosters/:id - Delete Roster', () => {
    let deleteTestRosterId;
    beforeEach(async () => {
      const rosterData = {
        flightNumber: `SK-DELETE-${Date.now()}`,
        departureTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        aircraftType: 'Boeing 737',
        pilots: [{ id: 1, role: 'chief' }],
        cabinCrew: [{ id: 3, role: 'chief' }]
      };
      const res = await request(app)
        .post('/api/rosters')
        .set('Authorization', `Bearer ${validToken}`)
        .send(rosterData);
      deleteTestRosterId = res.body.id;
    });
    it('should delete roster successfully with admin token and return 200/204', async () => {
      const res = await request(app)
        .delete(`/api/rosters/${deleteTestRosterId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 204]).toContain(res.status);
    });
    it('should return 403 Forbidden when regular user tries to delete', async () => {
      const rosterData = {
        flightNumber: `SK-403-${Date.now()}`,
        departureTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        aircraftType: 'Boeing 737',
        pilots: [{ id: 1, role: 'chief' }],
        cabinCrew: [{ id: 3, role: 'chief' }]
      };
      const createRes = await request(app)
        .post('/api/rosters')
        .set('Authorization', `Bearer ${validToken}`)
        .send(rosterData);
      const rosterId = createRes.body.id;
      const res = await request(app)
        .delete(`/api/rosters/${rosterId}`)
        .set('Authorization', `Bearer ${validToken}`);  // Non-admin token
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permission');
    });
    it('should return 404 when deleting non-existent roster', async () => {
      const res = await request(app)
        .delete('/api/rosters/99999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
    it('should return 401 when no authentication provided', async () => {
      const res = await request(app)
        .delete(`/api/rosters/${deleteTestRosterId}`);
      expect(res.status).toBe(401);
    });
  });
  describe('Concurrent Operations', () => {
    it('should handle concurrent seat assignments with locking', async () => {
      const user1Token = generateUserToken(1);
      const user2Token = generateUserToken(2);
      const seatData = {
        seatAssignments: [
          { passengerId: 100, seat: '12A' },
          { passengerId: 101, seat: '12B' }
        ]
      };
      const [res1, res2] = await Promise.all([
        request(app)
          .put(`/api/rosters/${testRosterId}/assign-seats`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send(seatData),
        request(app)
          .put(`/api/rosters/${testRosterId}/assign-seats`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send(seatData)
      ]);
      expect([res1.status, res2.status].sort()).toEqual([200, 409]);
    });
  });
});
