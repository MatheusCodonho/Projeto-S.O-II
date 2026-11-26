const request = require('supertest');
const app = require('../src/app');
const { reset } = require('../src/data/store');

describe('Auth API', () => {
  beforeEach(() => reset());

  test('POST /api/auth/register - bootstrap first user as ADMIN', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Admin', email: 'admin@test.com', password: 'password123'
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('ADMIN');
    expect(res.body.email).toBe('admin@test.com');
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('POST /api/auth/register - invalid password too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'X', email: 'x@test.com', password: 'short'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Senha/);
  });

  test('POST /api/auth/register - duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'B', email: 'a@test.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  test('POST /api/auth/register - missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@test.com' });
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/login - success', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('a@test.com');
  });

  test('POST /api/auth/login - invalid credentials', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/logout - requires auth', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/logout - success with token', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@test.com', password: 'password123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/logout').set('Authorization', 'Bearer ' + login.body.token);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sucesso/);
  });

  test('GET /api/auth/users - admin only', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@test.com', password: 'password123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'password123' });
    const res = await request(app).get('/api/auth/users').set('Authorization', 'Bearer ' + login.body.token);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  test('GET /api/auth/users - forbidden for non-admin', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@test.com', password: 'password123' });
    // register second user without admin
    const loginAdmin = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'password123' });
    await request(app).post('/api/auth/register').set('Authorization', 'Bearer ' + loginAdmin.body.token)
      .send({ name: 'B', email: 'b@test.com', password: 'password123', role: 'USER' });
    const loginUser = await request(app).post('/api/auth/login').send({ email: 'b@test.com', password: 'password123' });
    const res = await request(app).get('/api/auth/users').set('Authorization', 'Bearer ' + loginUser.body.token);
    expect(res.status).toBe(403);
  });
});