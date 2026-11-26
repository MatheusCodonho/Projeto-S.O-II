const request = require('supertest');
const app = require('../src/app');
const { reset } = require('../src/data/store');
const { ROLES } = require('../src/models/User');

async function getAdminToken(app) {
  await request(app).post('/api/auth/register').send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password123' });
  return login.body.token;
}

async function getManagerToken(app, adminToken) {
  await request(app).post('/api/auth/register').set('Authorization', 'Bearer ' + adminToken).send({ name: 'Manager', email: 'manager@test.com', password: 'password123', role: ROLES.MANAGER });
  const login = await request(app).post('/api/auth/login').send({ email: 'manager@test.com', password: 'password123' });
  return login.body.token;
}

async function getUserToken(app, adminToken) {
  await request(app).post('/api/auth/register').set('Authorization', 'Bearer ' + adminToken).send({ name: 'User', email: 'user@test.com', password: 'password123', role: ROLES.USER });
  const login = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'password123' });
  return login.body.token;
}

describe('Projects API', () => {
  beforeEach(() => reset());

  test('POST /api/projects - admin can create', async () => {
    const adminToken = await getAdminToken(app);
    const res = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'Projeto A', description: 'Desc' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Projeto A');
    expect(res.body.ownerId).toBeDefined();
  });

  test('POST /api/projects - manager can create', async () => {
    const adminToken = await getAdminToken(app);
    const managerToken = await getManagerToken(app, adminToken);
    const res = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + managerToken).send({ name: 'Projeto B', description: 'Desc' });
    expect(res.status).toBe(201);
  });

  test('POST /api/projects - user cannot create', async () => {
    const adminToken = await getAdminToken(app);
    const userToken = await getUserToken(app, adminToken);
    const res = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + userToken).send({ name: 'Projeto C' });
    expect(res.status).toBe(403);
  });

  test('POST /api/projects - requires name', async () => {
    const adminToken = await getAdminToken(app);
    const res = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ description: 'Sem nome' });
    expect(res.status).toBe(400);
  });

  test('GET /api/projects - list all', async () => {
    const adminToken = await getAdminToken(app);
    await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P2' });
    const res = await request(app).get('/api/projects').set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('GET /api/projects/:id - get by id', async () => {
    const adminToken = await getAdminToken(app);
    const create = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    const res = await request(app).get('/api/projects/' + create.body.id).set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(create.body.id);
  });

  test('GET /api/projects/:id - 404 for non-existent', async () => {
    const adminToken = await getAdminToken(app);
    const res = await request(app).get('/api/projects/999').set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(404);
  });

  test('PUT /api/projects/:id - admin can update any', async () => {
    const adminToken = await getAdminToken(app);
    const create = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'Old' });
    const res = await request(app).put('/api/projects/' + create.body.id).set('Authorization', 'Bearer ' + adminToken).send({ name: 'New' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New');
  });

  test('PUT /api/projects/:id - manager can update any', async () => {
    const adminToken = await getAdminToken(app);
    const managerToken = await getManagerToken(app, adminToken);
    const create = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'Old' });
    const res = await request(app).put('/api/projects/' + create.body.id).set('Authorization', 'Bearer ' + managerToken).send({ name: 'New' });
    expect(res.status).toBe(200);
  });

  test('PUT /api/projects/:id - user can only update own', async () => {
    const adminToken = await getAdminToken(app);
    const userToken = await getUserToken(app, adminToken);
    const create = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'Owned by admin' });
    const res = await request(app).put('/api/projects/' + create.body.id).set('Authorization', 'Bearer ' + userToken).send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  test('DELETE /api/projects/:id - admin can delete any', async () => {
    const adminToken = await getAdminToken(app);
    const create = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'To Delete' });
    const res = await request(app).delete('/api/projects/' + create.body.id).set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(204);
  });

  test('DELETE /api/projects/:id - owner can delete own', async () => {
    const adminToken = await getAdminToken(app);
    const create = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'Own' });
    const res = await request(app).delete('/api/projects/' + create.body.id).set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(204);
  });

  test('DELETE /api/projects/:id - manager cannot delete if not owner', async () => {
    const adminToken = await getAdminToken(app);
    const managerToken = await getManagerToken(app, adminToken);
    const create = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'Admin project' });
    const res = await request(app).delete('/api/projects/' + create.body.id).set('Authorization', 'Bearer ' + managerToken);
    expect(res.status).toBe(403);
  });

  test('DELETE /api/projects/:id - user cannot delete others', async () => {
    const adminToken = await getAdminToken(app);
    const userToken = await getUserToken(app, adminToken);
    const create = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'Admin project' });
    const res = await request(app).delete('/api/projects/' + create.body.id).set('Authorization', 'Bearer ' + userToken);
    expect(res.status).toBe(403);
  });
});