const { projects, tasks, users, auditLogs } = require('../data/store');
const { ROLES } = require('../models/User');
const { isProduction } = require('../config/env');

const dashboardController = {
  getStats: (req, res) => {
    const stats = {
      totalProjects: projects.length,
      totalTasks: tasks.length,
      tasksByStatus: {
        PENDING: tasks.filter(t => t.status === 'PENDING').length,
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
      }
    };

    // Admins veem mais info
    if (req.user.role === ROLES.ADMIN) {
      stats.totalUsers = users.length;
      stats.recentLogs = auditLogs.slice(-10).reverse();
    }

    res.json(stats);
  }
};

module.exports = dashboardController;
