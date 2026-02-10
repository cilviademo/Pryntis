const artistModel = require('../models/artistModel');
const { AppError } = require('../middleware/errorHandler');

const artistController = {
  // GET /api/v1/artists
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, search, status, genre } = req.query;
      const { artists, total } = await artistModel.findAll({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        search,
        status,
        genre,
      });

      const parsedLimit = parseInt(limit, 10);
      res.json({
        success: true,
        data: artists,
        message: 'Artists retrieved',
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

  // GET /api/v1/artists/:id
  async getById(req, res, next) {
    try {
      const artist = await artistModel.findById(req.params.id);
      if (!artist) {
        throw new AppError('Artist not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: artist,
        message: 'Artist retrieved',
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/artists
  async create(req, res, next) {
    try {
      const artist = await artistModel.create(req.body);
      res.status(201).json({
        success: true,
        data: artist,
        message: 'Artist created successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/artists/:id
  async update(req, res, next) {
    try {
      const artist = await artistModel.update(req.params.id, req.body);
      if (!artist) {
        throw new AppError('Artist not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: artist,
        message: 'Artist updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/artists/:id — soft delete
  async delete(req, res, next) {
    try {
      const artist = await artistModel.softDelete(req.params.id);
      if (!artist) {
        throw new AppError('Artist not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: artist,
        message: 'Artist archived successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = artistController;
