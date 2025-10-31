const db = require('../db');

async function createTask(req, res, next) {
  try {
    const { title, description } = req.body;
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // if authenticated, attach the user id to the task
    const userId = req.user && req.user.sub ? req.user.sub : null;

    const result = await db.query(
      'INSERT INTO tasks (title, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [title.trim(), description || null, userId]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function getAllTasks(req, res, next) {
  try {
    const userId = req.user && req.user.sub ? req.user.sub : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await db.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function getTaskById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user && req.user.sub ? req.user.sub : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await db.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    // Ensure at least one field to update
    if ((title === undefined || title === null) && (description === undefined || description === null)) {
      return res.status(400).json({ error: 'At least one of title or description must be provided' });
    }

    // Build dynamic SET clause safely
    const fields = [];
    const values = [];
    let idx = 1;
    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(title);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    const userId = req.user && req.user.sub ? req.user.sub : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    values.push(id);
    values.push(userId);

    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`;
    const result = await db.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user && req.user.sub ? req.user.sub : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await db.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    return res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}

// Public: return all tasks (assignment requirement). Use only for demo/testing.
async function getAllTasksPublic(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getAllTasksPublic,
};
