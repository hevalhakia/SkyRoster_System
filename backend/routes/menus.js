const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // GET /menus – tüm menüler
  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM Menu');
      res.json(rows);
    } catch (err) {
      console.error('Hata (GET /menus):', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // GET /menus/tree – parent/child ağaç yapısı
  router.get('/tree', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM Menu');
      const map = {};
      const roots = [];

      rows.forEach((m) => {
        map[m.menu_id] = { ...m, children: [] };
      });

      rows.forEach((m) => {
        if (m.parent_menu_id) {
          map[m.parent_menu_id].children.push(map[m.menu_id]);
        } else {
          roots.push(map[m.menu_id]);
        }
      });

      res.json(roots);
    } catch (err) {
      console.error('Hata (GET /menus/tree):', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // GET /menus/:id
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query('SELECT * FROM Menu WHERE menu_id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Menu not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(`Hata (GET /menus/${id}):`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /menus
  router.post('/', async (req, res) => {
    const { name, path, parent_menu_id } = req.body;

    if (!name || !path) {
      return res.status(400).json({ error: 'name and path are required' });
    }

    try {
      const [result] = await pool.query(
        `INSERT INTO Menu (name, path, parent_menu_id)
         VALUES (?, ?, ?)`,
        [name, path, parent_menu_id || null]
      );
      res.status(201).json({ message: 'Menu created', menu_id: result.insertId });
    } catch (err) {
      console.error('Hata (POST /menus):', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // PUT /menus/:id
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, path, parent_menu_id } = req.body;

    try {
      const [result] = await pool.query(
        `UPDATE Menu
         SET name = ?, path = ?, parent_menu_id = ?
         WHERE menu_id = ?`,
        [name, path, parent_menu_id || null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Menu not found' });
      }

      res.json({ message: 'Menu updated' });
    } catch (err) {
      console.error(`Hata (PUT /menus/${id}):`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // DELETE /menus/:id
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const [result] = await pool.query('DELETE FROM Menu WHERE menu_id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Menu not found' });
      }

      res.json({ message: 'Menu deleted' });
    } catch (err) {
      console.error(`Hata (DELETE /menus/${id}):`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return router;
};