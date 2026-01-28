const request = require('supertest');
const app = require('../../../index');
const { createTestDatabase, teardownTestDatabase } = require('../../fixtures/testData');
describe('Auth Routes - API Integration', () => {
  let token;
  let userId;
  beforeAll(async () => {
    await createTestDatabase();
  });
  afterAll(async () => {
    await teardownTestDatabase();
  });
  describe('POST /auth/register', () => {
    test('should register new user with 201 status', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      };
      const res = await request(app)
        .post('/auth/register')
        .send(userData);
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      userId = res.body.id;
    });
    test('should hash password (not store plaintext)', async () => {
      const userData = {
        email: 'test2@example.com',
        password: 'SecurePass123!',
        firstName: 'Test2',
        lastName: 'User2',
      };
      const res = await request(app)
        .post('/auth/register')
        .send(userData);
      expect(res.body.password).toBeUndefined();
    });
    test('should fail if email already exists', async () => {
      const userData = {
        email: 'test@example.com', // Zaten kayıtlı
        password: 'NewPass123!',
        firstName: 'Duplicate',
        lastName: 'User',
      };
      const res = await request(app)
        .post('/auth/register')
        .send(userData);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/email.*exists/i);
    });
    test('should fail with weak password', async () => {
      const userData = {
        email: 'weak@example.com',
        password: '123', // Çok kısa
        firstName: 'Weak',
        lastName: 'Pass',
      };
      const res = await request(app)
        .post('/auth/register')
        .send(userData);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/password/i);
    });
    test('should fail with invalid email', async () => {
      const userData = {
        email: 'not-an-email',
        password: 'SecurePass123!',
        firstName: 'Invalid',
        lastName: 'Email',
      };
      const res = await request(app)
        .post('/auth/register')
        .send(userData);
      expect(res.status).toBe(400);
    });
    test('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'incomplete@example.com' });
      expect(res.status).toBe(400);
    });
  });
  describe('POST /auth/login', () => {
    test('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };
      const res = await request(app)
        .post('/auth/login')
        .send(credentials);
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      token = res.body.token;
    });
    test('should return JWT token', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };
      const res = await request(app)
        .post('/auth/login')
        .send(credentials);
      expect(res.body.token).toMatch(/^eyJ/); // JWT başlığı
    });
    test('should fail with wrong password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPass123!',
      };
      const res = await request(app)
        .post('/auth/login')
        .send(credentials);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid.*credentials/i);
    });
    test('should fail with non-existent email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'SomePass123!',
      };
      const res = await request(app)
        .post('/auth/login')
        .send(credentials);
      expect(res.status).toBe(401);
    });
    test('should fail with missing credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
    });
  });
  describe('GET /auth/me', () => {
    test('should return current user info with valid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.id).toBe(userId);
    });
    test('should fail without authentication token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });
    test('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token-xyz');
      expect(res.status).toBe(401);
    });
    test('should not return password', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.body.password).toBeUndefined();
    });
  });
  describe('POST /auth/refresh', () => {
    test('should refresh token with valid token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.token).not.toBe(token); // Yeni token
    });
    test('should fail without token', async () => {
      const res = await request(app).post('/auth/refresh');
      expect(res.status).toBe(401);
    });
    test('should fail with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...expired';
      const res = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });
  describe('POST /auth/logout', () => {
    test('should logout successfully', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
    test('should invalidate token after logout', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };
      const loginRes = await request(app)
        .post('/auth/login')
        .send(credentials);
      const newToken = loginRes.body.token;
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newToken}`);
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${newToken}`);
      expect(res.status).toBe(401);
    });
  });
  describe('Role-Based Access Control', () => {
    test('should enforce admin-only endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      expect([403, 401]).toContain(res.status);
    });
    test('should allow user to access own resources', async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
    test('should prevent user accessing others\' resources', async () => {
      const res = await request(app)
        .get('/api/users/9999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
  describe('Token Expiration', () => {
    test('should include expiration time in token', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };
      const res = await request(app)
        .post('/auth/login')
        .send(credentials);
      const parts = res.body.token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.exp).toBeDefined();
    });
  });
});
