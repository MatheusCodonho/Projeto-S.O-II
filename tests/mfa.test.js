const request = require('supertest');
const app = require('../src/app');
const { reset } = require('../src/data/store');

async function getAdminToken(app) {
  await request(app).post('/api/auth/register').send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password123' });
  return login.body.token;
}

describe('MFA API', () => {
  beforeEach(() => reset());

  test('GET /api/auth/mfa/status - requires auth', async () => {
    const res = await request(app).get('/api/auth/mfa/status');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/mfa/status - returns mfaEnabled false by default', async () => {
    const adminToken = await getAdminToken(app);
    const res = await request(app).get('/api/auth/mfa/status').set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(200);
    expect(res.body.mfaEnabled).toBe(false);
  });

  test('POST /api/auth/mfa/setup - generates secret and QR code', async () => {
    const adminToken = await getAdminToken(app);
    const res = await request(app).post('/api/auth/mfa/setup').set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(200);
    expect(res.body.secret).toBeDefined();
    expect(res.body.otpauthUrl).toBeDefined();
    expect(res.body.qrCode).toBeDefined();
    expect(res.body.qrCode.startsWith('data:image/png;base64,')).toBe(true);
  });

  test('POST /api/auth/mfa/enable - fails with invalid token', async () => {
    const adminToken = await getAdminToken(app);
    await request(app).post('/api/auth/mfa/setup').set('Authorization', 'Bearer ' + adminToken);
    const res = await request(app).post('/api/auth/mfa/enable').set('Authorization', 'Bearer ' + adminToken).send({ token: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Token MFA inválido');
  });

  test('POST /api/auth/mfa/disable - requires password', async () => {
    const adminToken = await getAdminToken(app);
    const res = await request(app).post('/api/auth/mfa/disable').set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(401); // password required
    expect(res.body.error).toBe('Senha incorreta');
  });

  test('POST /api/auth/login - requires MFA token after enable', async () => {
    const adminToken = await getAdminToken(app);
    const setup = await request(app).post('/api/auth/mfa/setup').set('Authorization', 'Bearer ' + adminToken);

    // Use speakeasy to generate valid token
    const speakeasy = require('speakeasy');
    const validToken = speakeasy.totp({
      secret: setup.body.secret,
      encoding: 'base32',
    });

    await request(app).post('/api/auth/mfa/enable').set('Authorization', 'Bearer ' + adminToken).send({ token: validToken });

    // Login sem MFA deve falhar
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MFA_TOKEN_REQUIRED');

    // Login com MFA deve funcionar
    const validToken2 = speakeasy.totp({
      secret: setup.body.secret,
      encoding: 'base32',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'password123',
      mfaToken: validToken2
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });
});