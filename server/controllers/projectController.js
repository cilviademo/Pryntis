const projectModel = require('../models/projectModel');
const { AppError } = require('../middleware/errorHandler');

const projectController = {
  // GET /api/v1/projects
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, search, status, artist_id } = req.query;
      const { projects, total } = await projectModel.findAll({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        search,
        status,
        artist_id,
      });

      const parsedLimit = parseInt(limit, 10);
      res.json({
        success: true,
        data: projects,
        message: 'Projects retrieved',
        pagination: {
          page: parseInt(page, 10),
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/projects/:id
  async getById(req, res, next) {
    try {
      const project = await projectModel.findById(req.params.id);
      if (!project) {
        throw new AppError('Project not found', 404, 'NOT_FOUND');
      }

      const collaborators = await projectModel.getCollaborators(req.params.id);
      res.json({
        success: true,
        data: { ...project, collaborators },
        message: 'Project retrieved',
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/projects
  async create(req, res, next) {
    try {
      const project = await projectModel.create(req.body);
      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/projects/:id
  async update(req, res, next) {
    try {
      const project = await projectModel.update(req.params.id, req.body);
      if (!project) {
        throw new AppError('Project not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: project,
        message: 'Project updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/projects/:id — soft delete
  async delete(req, res, next) {
    try {
      const project = await projectModel.softDelete(req.params.id);
      if (!project) {
        throw new AppError('Project not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: project,
        message: 'Project archived successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/projects/:id/collaborators
  async addCollaborator(req, res, next) {
    try {
      const project = await projectModel.findById(req.params.id);
      if (!project) {
        throw new AppError('Project not found', 404, 'NOT_FOUND');
      }

      const { artist_id, role_description } = req.body;
      const collaborator = await projectModel.addCollaborator(
        req.params.id,
        artist_id,
        role_description
      );

      res.status(201).json({
        success: true,
        data: collaborator,
        message: 'Collaborator added successfully',
      });
    } catch (err) {
      if (err.code === '23505') {
        return next(new AppError('Artist is already a collaborator on this project', 409, 'DUPLICATE'));
      }
      next(err);
    }
  },

  // DELETE /api/v1/projects/:id/collaborators/:artistId
  async removeCollaborator(req, res, next) {
    try {
      const removed = await projectModel.removeCollaborator(req.params.id, req.params.artistId);
      if (!removed) {
        throw new AppError('Collaborator not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: null,
        message: 'Collaborator removed successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = projectController;
