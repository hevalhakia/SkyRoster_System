const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // GET /vehicletypes
  router.get('/', async (req, res) => {
    try {
      // Mock vehicle types data
      const mockVehicleTypes = [
        { vehicle_type_id: 1, name: 'Boeing 737', seat_count: 189, seat_map: { rows: 32, columns: 6 } },
        { vehicle_type_id: 2, name: 'Airbus A320', seat_count: 194, seat_map: { rows: 32, columns: 6 } },
        { vehicle_type_id: 3, name: 'Airbus A321', seat_count: 236, seat_map: { rows: 39, columns: 6 } },
        { vehicle_type_id: 4, name: 'Airbus A330', seat_count: 350, seat_map: { rows: 32, columns: 11 } },
        { vehicle_type_id: 5, name: 'Boeing 777', seat_count: 365, seat_map: { rows: 40, columns: 10 } },
        { vehicle_type_id: 6, name: 'Boeing 787', seat_count: 242, seat_map: { rows: 32, columns: 9 } }
      ];
      res.json(mockVehicleTypes);
    } catch (err) {
      console.error('Hata (GET /vehicletypes):', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // GET /vehicletypes/:id
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query('SELECT * FROM Vehicle_Type WHERE vehicle_type_id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Vehicle type not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(`Hata (GET /vehicletypes/${id}):`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /vehicletypes
  router.post('/', async (req, res) => {
    const { name, seat_count, seat_map } = req.body;
    try {
      const [result] = await pool.query(
        `INSERT INTO Vehicle_Type (name, seat_count, seat_map)
         VALUES (?, ?, ?)`,
        [name, seat_count, JSON.stringify(seat_map ?? {})]
      );
      res.status(201).json({ message: 'Vehicle type created', vehicle_type_id: result.insertId });
    } catch (err) {
      console.error('Hata (POST /vehicletypes):', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // PUT /vehicletypes/:id
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, seat_count, seat_map } = req.body;

    try {
      const [result] = await pool.query(
        `UPDATE Vehicle_Type
         SET name = ?, seat_count = ?, seat_map = ?
         WHERE vehicle_type_id = ?`,
        [name, seat_count, JSON.stringify(seat_map ?? {}), id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Vehicle type not found' });
      }

      res.json({ message: 'Vehicle type updated' });
    } catch (err) {
      console.error(`Hata (PUT /vehicletypes/${id}):`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // DELETE /vehicletypes/:id
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const [result] = await pool.query('DELETE FROM Vehicle_Type WHERE vehicle_type_id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Vehicle type not found' });
      }

      res.json({ message: 'Vehicle type deleted' });
    } catch (err) {
      console.error(`Hata (DELETE /vehicletypes/${id}):`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return router;
};
