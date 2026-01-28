const express = require('express');
const path = require('path');
const fs = require('fs/promises');

module.exports = (pool) => {
  const router = express.Router();

  // POST /roster/store - Store roster in SQL or NoSQL based on user choice
  // Body: { dbType: 'sql'|'nosql', roster: { ... } }
  router.post('/store', async (req, res) => {
    try {
      const dbTypeRaw = (req.body?.dbType || 'sql').toString().toLowerCase();
      const dbType = dbTypeRaw === 'nosql' ? 'nosql' : 'sql';
      const roster = req.body?.roster;

      if (!roster || typeof roster !== 'object') {
        return res.status(400).json({ error: 'roster object is required' });
      }

      const storedRoster = {
        ...roster,
        storedAt: new Date().toISOString(),
        storedBy: req.user?.userId || null
      };

      if (dbType === 'sql') {
        if (!pool) {
          return res.status(503).json({ error: 'SQL storage unavailable (no DB connection)' });
        }

        await ensureRosterStoreTable(pool);

        const flightId = roster.flight_id ?? null;
        const createdBy = req.user?.userId || null;
        const rosterJson = JSON.stringify(storedRoster);

        const [result] = await pool.query(
          'INSERT INTO Roster_Store (flight_id, storage_type, roster_json, created_by) VALUES (?, ?, ?, ?)',
          [flightId, 'sql', rosterJson, createdBy]
        );

        return res.json({
          message: 'Roster stored (SQL)',
          storage: { dbType: 'sql', storageId: result.insertId },
          roster: { ...storedRoster, storage: { dbType: 'sql', storageId: result.insertId } }
        });
      }

      // NoSQL: JSON document store on disk (backend/data/rosters.json)
      const recordId = await storeRosterNoSql({
        roster: storedRoster,
        flight_id: roster.flight_id ?? null,
        created_by: req.user?.userId || null
      });

      return res.json({
        message: 'Roster stored (NoSQL)',
        storage: { dbType: 'nosql', storageId: recordId },
        roster: { ...storedRoster, storage: { dbType: 'nosql', storageId: recordId } }
      });
    } catch (error) {
      console.error('Error (POST /roster/store):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /roster/generate - Generate roster from flight (real DB)
  router.post('/generate', async (req, res) => {
    try {
      const { flight_id } = req.body;

      if (!flight_id) {
        return res.status(400).json({ error: 'flight_id is required' });
      }

      // Fetch flight + vehicle + airports from junction tables
      const [flights] = await pool.query(
        `SELECT f.flight_id, f.flight_no, f.date_time, f.duration_min, f.distance_km,
                vt.name as vehicle_type, vt.seat_count,
                fs.airport_code as source_airport, fd.airport_code as destination_airport
         FROM Flight f
         LEFT JOIN Vehicle_Type vt ON f.vehicle_type_id = vt.vehicle_type_id
         LEFT JOIN Flight_Source fs ON f.flight_id = fs.flight_id
         LEFT JOIN Flight_Destination fd ON f.flight_id = fd.flight_id
         WHERE f.flight_id = ?`,
        [flight_id]
      );

      if (flights.length === 0) {
        return res.status(404).json({ error: 'Flight not found' });
      }

      const flight = flights[0];

      // Fetch crew assignments for flight
      const [crewRows] = await pool.query(
        `SELECT c.crew_id, c.first_name, c.last_name, c.crew_rank, fc.crew_role
         FROM Flight_Crew fc
         JOIN Cabin_Crew c ON fc.crew_id = c.crew_id
         WHERE fc.flight_id = ? AND c.active = TRUE`,
        [flight_id]
      );

      const pilots = crewRows
        .filter(c => ['Captain', 'First Officer', 'Pilot'].includes(c.crew_role))
        .map(c => ({
          id: c.crew_id,
          name: `${c.first_name} ${c.last_name}`,
          certType: c.crew_rank || c.crew_role || 'N/A',
          seniority: c.crew_rank || 'N/A'
        }));

      const cabinCrew = crewRows
        .filter(c => !['Captain', 'First Officer', 'Pilot'].includes(c.crew_role))
        .map(c => ({
          id: c.crew_id,
          name: `${c.first_name} ${c.last_name}`,
          type: c.crew_rank || 'Flight Attendant',
          language: 'EN'
        }));

      // Fetch passengers for flight (includes passenger_type and parent linkage)
      const [passengerRows] = await pool.query(
        `SELECT p.passenger_id, p.first_name, p.last_name, p.passenger_type, p.parent_passenger_id, p.ticket_class, fp.assigned_seat
         FROM Flight_Passenger fp
         JOIN Passenger p ON fp.passenger_id = p.passenger_id
         WHERE fp.flight_id = ? AND p.active = TRUE
         ORDER BY CASE WHEN p.passenger_type = 'INFANT' THEN 0 WHEN p.passenger_type = 'CHILD' THEN 1 ELSE 2 END, p.passenger_id ASC`,
        [flight_id]
      );

      const passengers = passengerRows.map(p => ({
        id: p.passenger_id,
        name: `${p.first_name} ${p.last_name}`,
        passengerType: p.passenger_type || 'ADULT',
        parentPassengerId: p.parent_passenger_id,
        ticket_class: p.ticket_class || 'Economy',
        assignedSeat: p.assigned_seat || null
      }));

      // Capacity rule counts only passengers who require seats (exclude INFANT)
      const seatedCount = passengers.filter(p => p.passengerType !== 'INFANT').length;

      const roster = {
        flight_id: flight.flight_id,
        flightNumber: flight.flight_no,
        aircraft: flight.vehicle_type || 'Unknown',
        aircraftCapacity: flight.seat_count || 150,
        date: flight.date_time,
        departureTime: flight.date_time,
        origin: flight.source_airport,
        destination: flight.destination_airport,
        duration_min: flight.duration_min,
        distance_km: flight.distance_km,
        pilots: pilots,
        cabinCrew: cabinCrew,
        passengers: passengers,
        rules: [
          { name: 'Pilot Composition', code: 'DR-01', passed: pilots && pilots.length >= 2 },
          { name: 'Vehicle/Distance Limits', code: 'DR-02', passed: (flight.distance_km || 0) <= 15000 && (flight.duration_min || 0) <= 1440 },
          { name: 'Cabin Composition', code: 'DR-03', passed: cabinCrew && cabinCrew.length >= 2 },
          { name: 'Capacity & Seats', code: 'DR-04', passed: seatedCount <= (flight.seat_count || 150) }
        ]
      };

      res.json(roster);
    } catch (error) {
      console.error('Error (POST /roster/generate):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /roster/validate - Validate roster
  router.post('/validate', async (req, res) => {
    try {
      const { pilots, cabinCrew, passengers, aircraftCapacity, duration_min, distance_km } = req.body;

      const rules = [
        {
          name: 'Pilot Composition',
          code: 'DR-01',
          passed: pilots && pilots.length >= 2
        },
        {
          name: 'Vehicle/Distance Limits',
          code: 'DR-02',
          passed: distance_km <= 15000 && duration_min <= 1440
        },
        {
          name: 'Cabin Composition',
          code: 'DR-03',
          passed: cabinCrew && cabinCrew.length >= 2
        },
        {
          name: 'Capacity & Seats',
          code: 'DR-04',
          passed: passengers && passengers.length <= (aircraftCapacity || 150)
        }
      ];

      res.json({ rules });
    } catch (error) {
      console.error('Error (POST /roster/validate):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /roster/assign-seats - Auto-assign seats
  router.post('/assign-seats', async (req, res) => {
    try {
      const roster = req.body;

      // If DB pool not available, fall back to in-memory assignment
      if (!pool) {
        const passengers = roster.passengers || [];
        const capacity = roster.aircraftCapacity || 150;
        const seatMap = generateSeatMap(capacity);
        let seatIndex = 0;
        const assignedPassengers = passengers.map((p) => {
          if (p.passengerType === 'INFANT') return p;
          if (seatIndex < seatMap.length) {
            return { ...p, assignedSeat: seatMap[seatIndex++] };
          }
          return p;
        });
        return res.json({ ...roster, passengers: assignedPassengers });
      }

      // Persist assigned seats to Flight_Passenger table
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const flightId = roster.flight_id;
        const passengers = roster.passengers || [];

        for (const p of passengers) {
          // Only update seats for passengers with assignedSeat present
          if (!p.id) continue;
          const seat = p.assignedSeat || null;
          await conn.query(
            `UPDATE Flight_Passenger SET assigned_seat = ? WHERE flight_id = ? AND passenger_id = ?`,
            [seat, flightId, p.id]
          );
        }

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      // Return roster (echo) after persistence
      res.json(roster);
    } catch (error) {
      console.error('Error (POST /roster/assign-seats):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // POST /roster/approve - Approve roster and save
  router.post('/approve', async (req, res) => {
    let conn;
    try {
      const dbTypeRaw = (req.body?.dbType || 'sql').toString().toLowerCase();
      const dbType = dbTypeRaw === 'nosql' ? 'nosql' : 'sql';
      const roster = req.body?.roster && typeof req.body.roster === 'object' ? req.body.roster : req.body;

      if (!roster || typeof roster !== 'object') {
        return res.status(400).json({ error: 'roster object is required' });
      }

      // NoSQL approval path: store roster payload and return it for client-side manifest
      if (dbType === 'nosql') {
        const approvedRoster = {
          ...roster,
          status: 'APPROVED',
          approvedAt: new Date().toISOString(),
          approvedBy: req.user?.userId || null
        };

        const storageId = await storeRosterNoSql({
          roster: approvedRoster,
          flight_id: roster.flight_id ?? null,
          created_by: req.user?.userId || null
        });

        return res.json({
          message: 'Roster approved and saved (NoSQL)',
          status: 'APPROVED',
          storage: { dbType: 'nosql', storageId },
          roster: { ...approvedRoster, storage: { dbType: 'nosql', storageId } }
        });
      }

      // SQL approval path (existing behavior)
      if (!roster.flight_id) {
        return res.status(400).json({ error: 'flight_id is required' });
      }

      conn = await pool.getConnection();
      await conn.beginTransaction();

      // Create roster record
      const [rosterResult] = await conn.query(
        'INSERT INTO Roster (flight_id, status, created_at, approved_by) VALUES (?, ?, NOW(), ?)',
        [roster.flight_id, 'APPROVED', req.user?.userId || 1]
      );

      const roster_id = rosterResult.insertId;

      // Update passenger seats in Flight_Passenger (persist seat assignment)
      for (const passenger of roster.passengers || []) {
        if (passenger.id) {
          const seat = passenger.assignedSeat || null;
          await conn.query(
            'UPDATE Flight_Passenger SET assigned_seat = ? WHERE flight_id = ? AND passenger_id = ?',
            [seat, roster.flight_id, passenger.id]
          );
        }
      }

      // Insert crew assignments
      for (const pilot of roster.pilots || []) {
        if (pilot.id) {
          await conn.query(
            'INSERT INTO Roster_Assignment (roster_id, crew_id, position) VALUES (?, ?, ?)',
            [roster_id, pilot.id, 'Pilot']
          );
        }
      }

      for (const crew of roster.cabinCrew || []) {
        if (crew.id) {
          await conn.query(
            'INSERT INTO Roster_Assignment (roster_id, crew_id, position) VALUES (?, ?, ?)',
            [roster_id, crew.id, 'Cabin Crew']
          );
        }
      }

      await conn.commit();

      res.json({
        message: 'Roster approved and saved',
        roster_id: roster_id,
        status: 'APPROVED'
      });
    } catch (error) {
      if (conn) await conn.rollback();
      console.error('Error (POST /roster/approve):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      if (conn) conn.release();
    }
  });

  // GET /roster/:rosterId - Get roster details
  router.get('/:roster_id', async (req, res) => {
    try {
      const [rosters] = await pool.query(
        'SELECT * FROM Roster WHERE roster_id = ?',
        [req.params.roster_id]
      );

      if (rosters.length === 0) {
        return res.status(404).json({ error: 'Roster not found' });
      }

      res.json(rosters[0]);
    } catch (error) {
      console.error('Error (GET /roster/:roster_id):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // GET /roster/manifest/:rosterId - Get final manifest
  router.get('/manifest/:roster_id', async (req, res) => {
    try {
      const [rosters] = await pool.query(
        `SELECT r.*, f.flight_no, f.date_time, vt.name as aircraft_type
         FROM Roster r
         JOIN Flight f ON r.flight_id = f.flight_id
         JOIN Vehicle_Type vt ON f.vehicle_type_id = vt.vehicle_type_id
         WHERE r.roster_id = ?`,
        [req.params.roster_id]
      );

      if (rosters.length === 0) {
        return res.status(404).json({ error: 'Roster not found' });
      }

      const roster = rosters[0];

      // Get crew assignments
      const [crews] = await pool.query(
        `SELECT ra.position, c.crew_id, CONCAT(c.first_name, ' ', c.last_name) as name
         FROM Roster_Assignment ra
         JOIN Cabin_Crew c ON ra.crew_id = c.crew_id
         WHERE ra.roster_id = ?`,
        [req.params.roster_id]
      );

      // Get passengers with seats
      const [passengers] = await pool.query(
        `SELECT p.passenger_id, CONCAT(p.first_name, ' ', p.last_name) as name,
                fp.assigned_seat, p.ticket_class, p.passenger_type, p.parent_passenger_id
         FROM Flight_Passenger fp
         JOIN Passenger p ON fp.passenger_id = p.passenger_id
         WHERE fp.flight_id = ? AND p.active = TRUE
         ORDER BY CASE WHEN p.passenger_type = 'INFANT' THEN 2 ELSE 1 END, p.passenger_id`,
        [roster.flight_id]
      );

      res.json({
        flight_no: roster.flight_no,
        date_time: roster.date_time,
        aircraft_type: roster.aircraft_type,
        status: roster.status,
        crews: crews,
        passengers: passengers
      });
    } catch (error) {
      console.error('Error (GET /roster/manifest/:roster_id):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return router;
};

function generateSeatMap(capacity) {
  const seats = [];
  const rows = Math.ceil(capacity / 6);
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < 6; j++) {
      seats.push(String.fromCharCode(65 + i) + (j + 1));
    }
  }
  
  return seats.slice(0, capacity);
}

async function ensureRosterStoreTable(pool) {
  // Keep this table minimal and independent from other roster tables.
  // Using LONGTEXT for broader compatibility; treat it as JSON payload.
  await pool.query(
    `CREATE TABLE IF NOT EXISTS Roster_Store (
      storage_id INT AUTO_INCREMENT PRIMARY KEY,
      flight_id INT NULL,
      storage_type VARCHAR(10) NOT NULL,
      roster_json LONGTEXT NOT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
}

async function storeRosterNoSql({ roster, flight_id, created_by }) {
  const dataDir = path.join(__dirname, '..', 'data');
  const dataFile = path.join(dataDir, 'rosters.json');

  await fs.mkdir(dataDir, { recursive: true });

  let existing = [];
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    existing = JSON.parse(raw);
    if (!Array.isArray(existing)) existing = [];
  } catch (err) {
    // File not found or invalid JSON: start fresh
    existing = [];
  }

  const id = `nosql_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  existing.push({
    _id: id,
    flight_id: flight_id ?? null,
    created_by: created_by ?? null,
    created_at: new Date().toISOString(),
    roster
  });

  await fs.writeFile(dataFile, JSON.stringify(existing, null, 2), 'utf8');
  return id;
}
