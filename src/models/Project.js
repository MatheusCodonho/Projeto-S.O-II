class Project {
  constructor({ id, name, description, ownerId, createdAt }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.ownerId = ownerId; // ID do usuário que criou o projeto
    this.createdAt = createdAt || new Date().toISOString();
  }
}

module.exports = Project;
