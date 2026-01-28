const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // -----------------
  // Validation
  // -----------------
  function validateFlight(data) {
    const errors = [];
    if (!data.flight_no || typeof data.flight_no !== 'string' || data.flight_no.trim() === '') {
      errors.push('flight_no is required and must be a non-empty string');
    }
    if (!data.date_time || isNaN(Date.parse(data.date_time))) {
      errors.push('date_time must be a valid date string');
    }
    if (typeof data.duration_min !== 'number' || data.duration_min <= 0) {
      errors.push('duration_min must be a positive number');
    }
    if (typeof data.distance_km !== 'number' || data.distance_km <= 0) {
      errors.push('distance_km must be a positive number');
    }
    if (typeof data.vehicle_type_id !== 'number' || data.vehicle_type_id <= 0) {
      errors.push('vehicle_type_id must be a positive number');
    }
    if (data.shared_flight_id !== null && data.shared_flight_id !== undefined && typeof data.shared_flight_id !== 'number') {
      errors.push('shared_flight_id must be a number or null');
    }
    if (!data.source_airport_code || typeof data.source_airport_code !== 'string' || data.source_airport_code.trim() === '') {
      errors.push('source_airport_code is required and must be a non-empty string');
    }
    if (!data.destination_airport_code || typeof data.destination_airport_code !== 'string' || data.destination_airport_code.trim() === '') {
      errors.push('destination_airport_code is required and must be a non-empty string');
    }
    return errors;
  }

  // GET /flights - Fetch real flights from database
  router.get('/', async (req, res) => {
    try {
      if (!pool) {
        console.warn('⚠️ Pool is null, returning empty flights array');
        return res.json([]);
      }

      const query = `
        SELECT 
          f.flight_id,
          f.flight_no,
          f.date_time,
          f.duration_min,
          f.distance_km,
          vt.name as vehicle_type,
          fs.airport_code as source_airport,
          fd.airport_code as destination_airport,
          f.shared_flight_id as partner_flight_no,
          NULL as partner_airline
        FROM Flight f
        LEFT JOIN Vehicle_Type vt ON f.vehicle_type_id = vt.vehicle_type_id
        LEFT JOIN Flight_Source fs ON f.flight_id = fs.flight_id
        LEFT JOIN Flight_Destination fd ON f.flight_id = fd.flight_id
        ORDER BY f.date_time ASC
      `;

      const [flights] = await pool.query(query);
      res.json(flights);
    } catch (error) {
      console.error('Hata (GET /flights):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /flights
  router.post('/', async (req, res) => {
    const errors = validateFlight(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const {
      flight_no,
      date_time,
      duration_min,
      distance_km,
      vehicle_type_id,
      shared_flight_id,
      source_airport_code,
      destination_airport_code
    } = req.body;

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO Flight 
         (flight_no, date_time, duration_min, distance_km, vehicle_type_id, shared_flight_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [flight_no, date_time, duration_min, distance_km, vehicle_type_id, shared_flight_id || null]
      );

      const flight_id = result.insertId;

      await conn.query(
        `INSERT INTO Flight_Source (flight_id, airport_code) VALUES (?, ?)`,
        [flight_id, source_airport_code]
      );

      await conn.query(
        `INSERT INTO Flight_Destination (flight_id, airport_code) VALUES (?, ?)`,
        [flight_id, destination_airport_code]
      );

      await conn.commit();
      res.status(201).json({ message: 'Flight created', flight_id });
    } catch (error) {
      if (conn) await conn.rollback();
      console.error('Hata (POST /flights):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      if (conn) conn.release();
    }
  });

  // GET /flights/:id
  router.get('/:id', async (req, res) => {
    const flightId = req.params.id;

    try {
      const [rows] = await pool.query(`
        SELECT f.flight_id, f.flight_no, f.date_time, f.duration_min, f.distance_km,
               vt.name AS vehicle_type,
               sf.partner_flight_no, sf.partner_airline,
               src.airport_code AS source_airport,
               dst.airport_code AS destination_airport
        FROM Flight f
        JOIN Vehicle_Type vt ON f.vehicle_type_id = vt.vehicle_type_id
        LEFT JOIN Shared_Flight sf ON f.shared_flight_id = sf.shared_flight_id
        LEFT JOIN Flight_Source src ON f.flight_id = src.flight_id
        LEFT JOIN Flight_Destination dst ON f.flight_id = dst.flight_id
        WHERE f.flight_id = ?
      `, [flightId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Flight not found' });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error(`Hata (GET /flights/${flightId}):`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // PUT /flights/:id
  router.put('/:id', async (req, res) => {
    const flightId = req.params.id;
    const errors = validateFlight(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const {
      flight_no,
      date_time,
      duration_min,
      distance_km,
      vehicle_type_id,
      shared_flight_id,
      source_airport_code,
      destination_airport_code
    } = req.body;

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        `UPDATE Flight SET
           flight_no = ?,
           date_time = ?,
           duration_min = ?,
           distance_km = ?,
           vehicle_type_id = ?,
           shared_flight_id = ?
         WHERE flight_id = ?`,
        [flight_no, date_time, duration_min, distance_km, vehicle_type_id, shared_flight_id || null, flightId]
      );

      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Flight not found' });
      }

      await conn.query(
        `UPDATE Flight_Source SET airport_code = ? WHERE flight_id = ?`,
        [source_airport_code, flightId]
      );

      await conn.query(
        `UPDATE Flight_Destination SET airport_code = ? WHERE flight_id = ?`,
        [destination_airport_code, flightId]
      );

      await conn.commit();
      res.json({ message: 'Flight updated' });
    } catch (error) {
      if (conn) await conn.rollback();
      console.error(`Hata (PUT /flights/${flightId}):`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      if (conn) conn.release();
    }
  });

  // DELETE /flights/:id
  router.delete('/:id', async (req, res) => {
    const flightId = req.params.id;

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      await conn.query(`DELETE FROM Flight_Source WHERE flight_id = ?`, [flightId]);
      await conn.query(`DELETE FROM Flight_Destination WHERE flight_id = ?`, [flightId]);

      const [result] = await conn.query(`DELETE FROM Flight WHERE flight_id = ?`, [flightId]);

      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Flight not found' });
      }

      await conn.commit();
      res.json({ message: 'Flight deleted' });
    } catch (error) {
      if (conn) await conn.rollback();
      console.error(`Hata (DELETE /flights/${flightId}):`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      if (conn) conn.release();
    }
  });

  return router;
};