const request = require('supertest');
const app = require('../src/app');
const { reset } = require('../src/data/store');
const { ROLES } = require('../src/models/User');
const { STATUS } = require('../src/models/Task');

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

describe('Tasks API', () => {
  beforeEach(() => reset());

  test('POST /api/tasks - admin can create', async () => {
    const adminToken = await getAdminToken(app);
    const proj = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    const res = await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + adminToken).send({ projectId: proj.body.id, title: 'Tarefa 1' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Tarefa 1');
    expect(res.body.status).toBe('PENDING');
  });

  test('POST /api/tasks - manager can create', async () => {
    const adminToken = await getAdminToken(app);
    const managerToken = await getManagerToken(app, adminToken);
    const proj = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    const res = await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + managerToken).send({ projectId: proj.body.id, title: 'Tarefa 2' });
    expect(res.status).toBe(201);
  });

  test('POST /api/tasks - user cannot create', async () => {
    const adminToken = await getAdminToken(app);
    const userToken = await getUserToken(app, adminToken);
    const proj = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    const res = await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + userToken).send({ projectId: proj.body.id, title: 'Tarefa 3' });
    expect(res.status).toBe(403);
  });

  test('POST /api/tasks - requires projectId and title', async () => {
    const adminToken = await getAdminToken(app);
    const res = await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + adminToken).send({ title: 'Sem projeto' });
    expect(res.status).toBe(400);
  });

  test('GET /api/tasks/project/:projectId - list by project', async () => {
    const adminToken = await getAdminToken(app);
    const proj = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + adminToken).send({ projectId: proj.body.id, title: 'T1' });
    await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + adminToken).send({ projectId: proj.body.id, title: 'T2' });
    const res = await request(app).get('/api/tasks/project/' + proj.body.id).set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('PATCH /api/tasks/:id/status - any authenticated can update status', async () => {
    const adminToken = await getAdminToken(app);
    const proj = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    const task = await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + adminToken).send({ projectId: proj.body.id, title: 'T1' });

    const res = await request(app).patch('/api/tasks/' + task.body.id + '/status').set('Authorization', 'Bearer ' + adminToken).send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  test('PATCH /api/tasks/:id/status - validates status enum', async () => {
    const adminToken = await getAdminToken(app);
    const proj = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    const task = await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + adminToken).send({ projectId: proj.body.id, title: 'T1' });

    const res = await request(app).patch('/api/tasks/' + task.body.id + '/status').set('Authorization', 'Bearer ' + adminToken).send({ status: 'INVALID' });
    expect(res.status).toBe(400);
  });

  test('DELETE /api/tasks/:id - admin can delete', async () => {
    const adminToken = await getAdminToken(app);
    const proj = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    const task = await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + adminToken).send({ projectId: proj.body.id, title: 'T1' });
    const res = await request(app).delete('/api/tasks/' + task.body.id).set('Authorization', 'Bearer ' + adminToken);
    expect(res.status).toBe(204);
  });

  test('DELETE /api/tasks/:id - manager can delete', async () => {
    const adminToken = await getAdminToken(app);
    const managerToken = await getManagerToken(app, adminToken);
    const proj = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    const task = await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + adminToken).send({ projectId: proj.body.id, title: 'T1' });
    const res = await request(app).delete('/api/tasks/' + task.body.id).set('Authorization', 'Bearer ' + managerToken);
    expect(res.status).toBe(204);
  });

  test('DELETE /api/tasks/:id - user cannot delete', async () => {
    const adminToken = await getAdminToken(app);
    const userToken = await getUserToken(app, adminToken);
    const proj = await request(app).post('/api/projects').set('Authorization', 'Bearer ' + adminToken).send({ name: 'P1' });
    const task = await request(app).post('/api/tasks').set('Authorization', 'Bearer ' + adminToken).send({ projectId: proj.body.id, title: 'T1' });
    const res = await request(app).delete('/api/tasks/' + task.body.id).set('Authorization', 'Bearer ' + userToken);
    expect(res.status).toBe(403);
  });
});