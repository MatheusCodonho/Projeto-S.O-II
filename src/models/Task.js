const STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
});

class Task {
  constructor({ id, projectId, title, description, assignedTo, status = STATUS.PENDING, createdAt }) {
    this.id = id;
    this.projectId = projectId;
    this.title = title;
    this.description = description;
    this.assignedTo = assignedTo; // ID do usuário atribuído
    this.status = status;
    this.createdAt = createdAt || new Date().toISOString();
  }
}

module.exports = { Task, STATUS };
