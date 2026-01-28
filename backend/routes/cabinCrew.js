const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  function validateCabinCrew(data) {
    const errors = [];
    if (!data.first_name || data.first_name.trim() === '') errors.push('first_name is required');
    if (!data.last_name || data.last_name.trim() === '') errors.push('last_name is required');
    if (!data.crew_rank || data.crew_rank.trim() === '') errors.push('crew_rank is required');
    if (!data.base_airport_code || data.base_airport_code.trim() === '') errors.push('base_airport_code is required');
    if (!data.hire_date || isNaN(Date.parse(data.hire_date))) errors.push('hire_date must be a valid date');
    return errors;
  }

  // GET /cabincrew
  router.get('/', async (req, res) => {
    try {
      // Mock cabin crew data
      const mockCrew = [
        { crew_id: 1, first_name: 'Zeynep', last_name: 'Mutlu', crew_rank: 'Flight Attendant', base_airport_code: 'IST', hire_date: '2020-01-15', active: true },
        { crew_id: 2, first_name: 'Hanife', last_name: 'Aydın', crew_rank: 'Flight Attendant', base_airport_code: 'IST', hire_date: '2019-06-20', active: true },
        { crew_id: 3, first_name: 'Gözde', last_name: 'Yalçın', crew_rank: 'Senior Flight Attendant', base_airport_code: 'IST', hire_date: '2018-03-10', active: true },
        { crew_id: 4, first_name: 'Metin', last_name: 'Karagöz', crew_rank: 'Flight Attendant', base_airport_code: 'AYT', hire_date: '2021-02-01', active: true },
        { crew_id: 5, first_name: 'Nilüfer', last_name: 'Aslan', crew_rank: 'Flight Attendant', base_airport_code: 'IST', hire_date: '2020-09-15', active: true },
        { crew_id: 6, first_name: 'Ahmet', last_name: 'Demir', crew_rank: 'Purser', base_airport_code: 'IST', hire_date: '2017-05-12', active: true },
        { crew_id: 7, first_name: 'Fatma', last_name: 'Şahin', crew_rank: 'Flight Attendant', base_airport_code: 'ESB', hire_date: '2021-04-20', active: true },
        { crew_id: 8, first_name: 'Serhan', last_name: 'Kaya', crew_rank: 'Flight Attendant', base_airport_code: 'IST', hire_date: '2019-08-05', active: true },
        { crew_id: 9, first_name: 'Aylin', last_name: 'Çetin', crew_rank: 'Flight Attendant', base_airport_code: 'IST', hire_date: '2020-11-10', active: true },
        { crew_id: 10, first_name: 'Hüseyin', last_name: 'Erdoğan', crew_rank: 'Senior Flight Attendant', base_airport_code: 'AYT', hire_date: '2018-07-25', active: true }
      ];
      res.json(mockCrew);
    } catch (err) {
      console.error('Hata (GET /cabincrew):', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /cabincrew
  router.post('/', async (req, res) => {
    const errors = validateCabinCrew(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { first_name, last_name, crew_rank, base_airport_code, hire_date } = req.body;
    try {
      const [result] = await pool.query(
        `INSERT INTO Cabin_Crew (first_name, last_name, crew_rank, base_airport_code, hire_date)
         VALUES (?, ?, ?, ?, ?)`,
        [first_name, last_name, crew_rank, base_airport_code, hire_date]
      );
      res.status(201).json({ message: 'Cabin crew member added', crew_id: result.insertId });
    } catch (err) {
      console.error('Hata (POST /cabincrew):', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // GET /cabincrew/:id
  router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {
      const [rows] = await pool.query('SELECT * FROM Cabin_Crew WHERE crew_id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(`Hata (GET /cabincrew/${id}):`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // PUT /cabincrew/:id
  router.put('/:id', async (req, res) => {
    const errors = validateCabinCrew(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const id = req.params.id;
    const { first_name, last_name, crew_rank, base_airport_code, hire_date, active } = req.body;
    try {
      const [result] = await pool.query(
        `UPDATE Cabin_Crew 
         SET first_name = ?, last_name = ?, crew_rank = ?, base_airport_code = ?, hire_date = ?, active = ? 
         WHERE crew_id = ?`,
        [first_name, last_name, crew_rank, base_airport_code, hire_date, active, id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
      res.json({ message: 'Cabin crew member updated' });
    } catch (err) {
      console.error(`Hata (PUT /cabincrew/${id}):`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // DELETE /cabincrew/:id  → soft delete
  router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
      const [result] = await pool.query('UPDATE Cabin_Crew SET active = FALSE WHERE crew_id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
      res.json({ message: 'Cabin crew member deactivated' });
    } catch (err) {
      console.error(`Hata (DELETE /cabincrew/${id}):`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return router;
};