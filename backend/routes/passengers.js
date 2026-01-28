const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // GET /passengers - Get all passengers or filter by flight
  router.get('/', async (req, res) => {
    try {
      const { flight_id } = req.query;
      let query = 'SELECT * FROM Passenger WHERE active = TRUE';
      const params = [];

      if (flight_id) {
        query += ' AND flight_id = ?';
        params.push(flight_id);
      }

      const [passengers] = await pool.query(query, params);
      res.json(passengers);
    } catch (error) {
      console.error('Error (GET /passengers):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // GET /passengers/:id - Get specific passenger
  router.get('/:id', async (req, res) => {
    try {
      const [passengers] = await pool.query(
        'SELECT * FROM Passenger WHERE passenger_id = ?',
        [req.params.id]
      );
      if (passengers.length === 0) {
        return res.status(404).json({ error: 'Passenger not found' });
      }
      res.json(passengers[0]);
    } catch (error) {
      console.error('Error (GET /passengers/:id):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /passengers - Create new passenger
  router.post('/', async (req, res) => {
    try {
      const { first_name, last_name, flight_id, assigned_seat, ticket_class } = req.body;

      if (!first_name || !last_name || !flight_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const [result] = await pool.query(
        'INSERT INTO Passenger (first_name, last_name, flight_id, assigned_seat, ticket_class) VALUES (?, ?, ?, ?, ?)',
        [first_name, last_name, flight_id, assigned_seat || null, ticket_class || 'Economy']
      );

      res.status(201).json({
        message: 'Passenger created',
        passenger_id: result.insertId
      });
    } catch (error) {
      console.error('Error (POST /passengers):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // PUT /passengers/:id - Update passenger
  router.put('/:id', async (req, res) => {
    try {
      const { first_name, last_name, assigned_seat, ticket_class } = req.body;

      const [result] = await pool.query(
        'UPDATE Passenger SET first_name = ?, last_name = ?, assigned_seat = ?, ticket_class = ? WHERE passenger_id = ?',
        [first_name, last_name, assigned_seat, ticket_class, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Passenger not found' });
      }

      res.json({ message: 'Passenger updated' });
    } catch (error) {
      console.error('Error (PUT /passengers/:id):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return router;
};
