const { Task, STATUS } = require('../models/Task');
const { tasks, projects, auditLogs, nextId, persist } = require('../data/store');
const { ROLES } = require('../models/User');
const { isProduction } = require('../config/env');

function log(action, userId, ip, result, details) {
  auditLogs.push({
    id: auditLogs.length + 1,
    action,
    userId,
    ip,
    result,
    details,
    timestamp: new Date().toISOString()
  });
  if (isProduction) {
    persist();
  } else {
    require('../data/store').persistSync();
  }
}

const taskController = {
  create: (req, res) => {
    const { projectId, title, description, assignedTo } = req.body;
    if (!projectId || !title) return res.status(400).json({ error: 'Projeto e título são obrigatórios' });

    const project = projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

    const task = new Task({
      id: nextId(tasks),
      projectId,
      title,
      description,
      assignedTo,
      status: STATUS.PENDING
    });

    tasks.push(task);
    log('CREATE_TASK', req.user.id, req.ip, 'success', { taskId: task.id, projectId });
    res.status(201).json(task);
  },

  listByProject: (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const filteredTasks = tasks.filter(t => t.projectId === projectId);
    res.json(filteredTasks);
  },

  updateStatus: (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!Object.values(STATUS).includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

    tasks[index].status = status;
    log('UPDATE_TASK_STATUS', req.user.id, req.ip, 'success', { taskId: id, status });
    res.json(tasks[index]);
  },

  delete: (req, res) => {
    const id = parseInt(req.params.id);
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

    tasks.splice(index, 1);
    log('DELETE_TASK', req.user.id, req.ip, 'success', { taskId: id });
    res.status(204).send();
  }
};

module.exports = taskController;