const express = require('express');
const router = express.Router();
const controller = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');

// Create requires auth and will associate the task to the authenticated user
router.post('/', requireAuth, controller.createTask);

// Public endpoint to fetch all tasks (assignment requirement / demo)
router.get('/all', controller.getAllTasksPublic);

// For privacy, list and read tasks only for the authenticated owner
router.get('/', requireAuth, controller.getAllTasks);
router.get('/:id', requireAuth, controller.getTaskById);

// Update/Delete restricted to the owner
router.put('/:id', requireAuth, controller.updateTask);
router.delete('/:id', requireAuth, controller.deleteTask);

module.exports = router;
