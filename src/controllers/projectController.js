const Project = require('../models/Project');
const { projects, auditLogs, nextId, persist } = require('../data/store');
const { ROLES } = require('../models/User');

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
  persist();
}

const projectController = {
  create: (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do projeto é obrigatório' });

    const project = new Project({
      id: nextId(projects),
      name,
      description,
      ownerId: req.user.id
    });

    projects.push(project);
    log('CREATE_PROJECT', req.user.id, req.ip, 'success', { projectId: project.id });
    res.status(201).json(project);
  },

  list: (req, res) => {
    res.json(projects);
  },

  getById: (req, res) => {
    const project = projects.find(p => p.id === parseInt(req.params.id));
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(project);
  },

  update: (req, res) => {
    const id = parseInt(req.params.id);
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });

    const project = projects[index];
    // USER só pode editar seus próprios projetos
    // ADMIN e MANAGER podem editar qualquer projeto
    if (req.user.role === ROLES.USER && project.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Sem permissão para editar este projeto' });
    }

    const { name, description } = req.body;
    projects[index] = { ...project, name: name || project.name, description: description || project.description };

    log('UPDATE_PROJECT', req.user.id, req.ip, 'success', { projectId: id });
    res.json(projects[index]);
  },

  delete: (req, res) => {
    const id = parseInt(req.params.id);
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });

    const project = projects[index];
    if (project.ownerId !== req.user.id && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: 'Apenas o dono ou Admin pode excluir o projeto' });
    }

    projects.splice(index, 1);
    log('DELETE_PROJECT', req.user.id, req.ip, 'success', { projectId: id });
    res.status(204).send();
  }
};

module.exports = projectController;