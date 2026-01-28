const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // ============================
  //  Helpers
  // ============================

  function validateRole(data) {
    const errors = [];
    if (!data.role_name || typeof data.role_name !== 'string' || data.role_name.trim() === '') {
      errors.push('role_name is required and must be a non-empty string');
    }
    return errors;
  }

  function parseBoolean(value) {
    if (value === true || value === false) return value;
    if (value === 1 || value === '1' || value === 'true' || value === 'TRUE') return true;
    if (value === 0 || value === '0' || value === 'false' || value === 'FALSE') return false;
    return false;
  }

  // ============================
  //  ROLE CRUD
  // ============================

  // GET /roles
  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM Role');
      return res.json(rows);
    } catch (error) {
      console.error('GET /roles error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: 'Failed to fetch roles'
      });
    }
  });

  // GET /roles/:id
  router.get('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid role id' });
    }

    try {
      const [rows] = await pool.query('SELECT * FROM Role WHERE role_id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Role not found' });
      }
      return res.json(rows[0]);
    } catch (error) {
      console.error(`GET /roles/${id} error:`, error);
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: 'Failed to fetch role'
      });
    }
  });

  // POST /roles
  router.post('/', async (req, res) => {
    const errors = validateRole(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { role_name, description } = req.body;

    try {
      const [result] = await pool.query(
        'INSERT INTO Role (role_name, description) VALUES (?, ?)',
        [role_name, description || null]
      );
      return res.status(201).json({
        message: 'Role created',
        role_id: result.insertId
      });
    } catch (error) {
      // Aynı isimde role varsa
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Role name already exists',
          detail: `role_name '${role_name}' is already in use`
        });
      }

      console.error('POST /roles error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: 'Failed to create role'
      });
    }
  });

  // PUT /roles/:id
  router.put('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid role id' });
    }

    const errors = validateRole(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { role_name, description } = req.body;

    try {
      const [result] = await pool.query(
        'UPDATE Role SET role_name = ?, description = ? WHERE role_id = ?',
        [role_name, description || null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Role not found' });
      }

      return res.json({ message: 'Role updated' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Role name already exists',
          detail: `role_name '${role_name}' is already in use`
        });
      }

      console.error(`PUT /roles/${id} error:`, error);
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: 'Failed to update role'
      });
    }
  });

  // DELETE /roles/:id
  router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid role id' });
    }

    try {
      const [result] = await pool.query('DELETE FROM Role WHERE role_id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Role not found' });
      }
      return res.json({ message: 'Role deleted' });
    } catch (error) {
      console.error(`DELETE /roles/${id} error:`, error);
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: 'Failed to delete role'
      });
    }
  });

  // ============================
  //  ROLE_MENU_PERMISSION
  // ============================

  // GET /roles/permissions/all – tüm rol-menü izinleri
  router.get('/permissions/all', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          rmp.role_id,
          r.role_name,
          rmp.menu_id,
          m.name AS menu_name,
          rmp.can_view,
          rmp.can_edit
        FROM Role_Menu_Permission rmp
        JOIN Role r ON rmp.role_id = r.role_id
        JOIN Menu m ON rmp.menu_id = m.menu_id
      `);
      return res.json(rows);
    } catch (error) {
      console.error('GET /roles/permissions/all error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: 'Failed to fetch role permissions'
      });
    }
  });

  // GET /roles/permissions/:role_id – tek bir rolün izinleri
  router.get('/permissions/:role_id', async (req, res) => {
    const role_id = req.params.role_id;

    if (!role_id || isNaN(Number(role_id))) {
      return res.status(400).json({ error: 'Invalid role id' });
    }

    try {
      const [rows] = await pool.query(`
        SELECT
          rmp.role_id,
          r.role_name,
          rmp.menu_id,
          m.name AS menu_name,
          rmp.can_view,
          rmp.can_edit
        FROM Role_Menu_Permission rmp
        JOIN Role r ON rmp.role_id = r.role_id
        JOIN Menu m ON rmp.menu_id = m.menu_id
        WHERE rmp.role_id = ?
      `, [role_id]);
      return res.json(rows);
    } catch (error) {
      console.error(`GET /roles/permissions/${role_id} error:`, error);
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: 'Failed to fetch role permissions'
      });
    }
  });

  // POST /roles/permissions – insert veya update
  router.post('/permissions', async (req, res) => {
    const { role_id, menu_id } = req.body;
    const can_view = parseBoolean(req.body.can_view);
    const can_edit = parseBoolean(req.body.can_edit);

    if (!role_id || !menu_id) {
      return res.status(400).json({ error: 'role_id and menu_id are required' });
    }

    try {
      await pool.query(`
        INSERT INTO Role_Menu_Permission (role_id, menu_id, can_view, can_edit)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          can_view = VALUES(can_view),
          can_edit = VALUES(can_edit)
      `, [role_id, menu_id, can_view, can_edit]);

      return res.json({ message: 'Permission upserted' });
    } catch (error) {
      console.error('POST /roles/permissions error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: 'Failed to upsert permission'
      });
    }
  });

  // DELETE /roles/permissions – body’de role_id + menu_id
  router.delete('/permissions', async (req, res) => {
    const { role_id, menu_id } = req.body;

    if (!role_id || !menu_id) {
      return res.status(400).json({ error: 'role_id and menu_id are required' });
    }

    try {
      const [result] = await pool.query(
        'DELETE FROM Role_Menu_Permission WHERE role_id = ? AND menu_id = ?',
        [role_id, menu_id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Permission not found' });
      }
      return res.json({ message: 'Permission deleted' });
    } catch (error) {
      console.error('DELETE /roles/permissions error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: 'Failed to delete permission'
      });
    }
  });

  return router;
};
