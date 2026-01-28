-- ============================
--  TEST DATA (SEED)
-- ============================

-- INSERT AIRPORTS
INSERT INTO Airport (airport_code, name, city, country) VALUES
('JFK', 'John F. Kennedy International', 'New York', 'USA'),
('LHR', 'London Heathrow', 'London', 'UK'),
('CDG', 'Charles de Gaulle', 'Paris', 'France'),
('IST', 'Istanbul Airport', 'Istanbul', 'Turkey'),
('AYT', 'Antalya Airport', 'Antalya', 'Turkey'),
('LAX', 'Los Angeles International', 'Los Angeles', 'USA'),
('DXB', 'Dubai International', 'Dubai', 'UAE'),
('HND', 'Haneda', 'Tokyo', 'Japan'),
('SFO', 'San Francisco International', 'San Francisco', 'USA'),
('ORD', 'Chicago O''Hare', 'Chicago', 'USA');

-- INSERT VEHICLE TYPES
INSERT INTO Vehicle_Type (name, seat_count, seat_map) VALUES
('Boeing 777', 350, '{"rows": 14, "cols": 10}'),
('Airbus A380', 555, '{"rows": 18, "cols": 10}'),
('Boeing 747', 416, '{"rows": 14, "cols": 10}'),
('Airbus A350', 325, '{"rows": 13, "cols": 9}'),
('Boeing 737', 189, '{"rows": 32, "cols": 6}');

-- INSERT FLIGHTS (Realistic data)
INSERT INTO Flight (flight_no, date_time, duration_min, distance_km, vehicle_type_id) VALUES
('AA1001', '2025-01-20 08:00:00', 720, 5570, 1),
('BA1234', '2025-01-20 10:30:00', 360, 3450, 5),
('AF2000', '2025-01-20 12:00:00', 120, 400, 5),
('TK5050', '2025-01-20 14:30:00', 300, 2000, 1),
('EK2020', '2025-01-20 16:00:00', 840, 6000, 2),
('JL7777', '2025-01-20 18:00:00', 480, 8000, 3),
('UA3333', '2025-01-21 08:00:00', 300, 4200, 4),
('DL4444', '2025-01-21 10:00:00', 360, 2800, 5),
('LH5555', '2025-01-21 12:00:00', 200, 1200, 5),
('CA6666', '2025-01-21 14:00:00', 600, 8500, 2);

-- INSERT FLIGHT SOURCE/DESTINATION
INSERT INTO Flight_Source (flight_id, airport_code) VALUES
(1, 'JFK'), (2, 'LHR'), (3, 'CDG'), (4, 'IST'), (5, 'AYT'),
(6, 'HND'), (7, 'SFO'), (8, 'ORD'), (9, 'LAX'), (10, 'DXB');

INSERT INTO Flight_Destination (flight_id, airport_code) VALUES
(1, 'LHR'), (2, 'CDG'), (3, 'CDG'), (4, 'AYT'), (5, 'DXB'),
(6, 'LAX'), (7, 'ORD'), (8, 'LAX'), (9, 'JFK'), (10, 'IST');

-- INSERT CABIN CREW (Pilots and Flight Attendants)
INSERT INTO Cabin_Crew (first_name, last_name, crew_rank, base_airport_code, hire_date) VALUES
('John', 'Smith', 'Captain Pilot', 'JFK', '2010-05-15'),
('Emily', 'Johnson', 'First Officer Pilot', 'JFK', '2015-08-20'),
('Michael', 'Brown', 'Captain Pilot', 'LHR', '2008-03-10'),
('Sarah', 'Williams', 'First Officer Pilot', 'LHR', '2016-11-05'),
('Alice', 'Davis', 'Flight Attendant', 'JFK', '2018-01-20'),
('Bob', 'Miller', 'Flight Attendant', 'JFK', '2019-06-15'),
('Carol', 'Wilson', 'Senior Flight Attendant', 'LHR', '2012-04-10'),
('David', 'Moore', 'Flight Attendant', 'LHR', '2020-02-28'),
('Eve', 'Taylor', 'Flight Attendant', 'CDG', '2017-09-12'),
('Frank', 'Anderson', 'Senior Flight Attendant', 'CDG', '2010-07-25'),
('Grace', 'Thomas', 'Flight Attendant', 'IST', '2021-03-01'),
('Henry', 'Jackson', 'Flight Attendant', 'IST', '2019-10-15'),
('Iris', 'White', 'Captain Pilot', 'AYT', '2009-12-08'),
('Jack', 'Harris', 'First Officer Pilot', 'AYT', '2017-05-22'),
('Katherine', 'Martin', 'Flight Attendant', 'AYT', '2020-08-10');

-- INSERT PASSENGERS FOR EACH FLIGHT (10 per flight)
INSERT INTO Passenger (first_name, last_name, flight_id, ticket_class) VALUES
-- Flight 1 (AA1001)
('Robert', 'Martinez', 1, 'Business'),
('Jennifer', 'Garcia', 1, 'Economy'),
('William', 'Rodriguez', 1, 'Economy'),
('Mary', 'Lee', 1, 'Economy'),
('James', 'Patel', 1, 'First'),
('Patricia', 'Singh', 1, 'Economy'),
('Michael', 'Kumar', 1, 'Business'),
('Linda', 'Zhang', 1, 'Economy'),
('David', 'Chang', 1, 'Economy'),
('Barbara', 'Kim', 1, 'Economy'),
-- Flight 2 (BA1234)
('Richard', 'Lopez', 2, 'Business'),
('Susan', 'González', 2, 'Economy'),
('Joseph', 'Hernández', 2, 'Economy'),
('Jessica', 'Pérez', 2, 'Economy'),
('Thomas', 'Ramirez', 2, 'First'),
('Sarah', 'Torres', 2, 'Economy'),
('Charles', 'Peterson', 2, 'Business'),
('Karen', 'Gray', 2, 'Economy'),
('Christopher', 'Ramirez', 2, 'Economy'),
('Nancy', 'James', 2, 'Economy'),
-- Flight 3 (AF2000)
('Daniel', 'Watson', 3, 'Economy'),
('Lisa', 'Brooks', 3, 'Economy'),
('Matthew', 'Chavez', 3, 'Economy'),
('Betty', 'Bennett', 3, 'Economy'),
('Mark', 'Gardner', 3, 'Economy'),
('Margaret', 'Williamson', 3, 'Economy'),
('Donald', 'Morris', 3, 'Economy'),
('Sandra', 'Rogers', 3, 'Economy'),
('Steven', 'Cook', 3, 'Economy'),
('Ashley', 'Morgan', 3, 'Economy'),
-- Flight 4 (TK5050)
('Paul', 'Bell', 4, 'Business'),
('Kimberly', 'Murphy', 4, 'Economy'),
('Andrew', 'Bailey', 4, 'Economy'),
('Donna', 'Rivera', 4, 'Economy'),
('Joshua', 'Cooper', 4, 'First'),
('Carol', 'Richardson', 4, 'Economy'),
('Kenneth', 'Cox', 4, 'Business'),
('Michelle', 'Howard', 4, 'Economy'),
('Kevin', 'Ward', 4, 'Economy'),
('Amanda', 'Cox', 4, 'Economy'),
-- Flight 5 (EK2020)
('Brian', 'Peterson', 5, 'Business'),
('Melissa', 'Gray', 5, 'Economy'),
('Edward', 'Ramirez', 5, 'Economy'),
('Deborah', 'James', 5, 'Economy'),
('Ronald', 'Watson', 5, 'First'),
('Stephanie', 'Brooks', 5, 'Economy'),
('Timothy', 'Chavez', 5, 'Business'),
('Rebecca', 'Bennett', 5, 'Economy'),
('Jason', 'Gardner', 5, 'Economy'),
('Sharon', 'Williamson', 5, 'Economy'),
-- Flights 6-10: Add 10 passengers each
-- Flight 6 (JL7777)
('Jeffrey', 'Morris', 6, 'Business'),
('Cynthia', 'Rogers', 6, 'Economy'),
('Ryan', 'Cook', 6, 'Economy'),
('Kathleen', 'Morgan', 6, 'Economy'),
('Jacob', 'Peterson', 6, 'First'),
('Amy', 'Gray', 6, 'Economy'),
('Gary', 'Ramirez', 6, 'Business'),
('Shirley', 'James', 6, 'Economy'),
('Nicholas', 'Watson', 6, 'Economy'),
('Angela', 'Brooks', 6, 'Economy'),
-- Flight 7 (UA3333)
('Eric', 'Chavez', 7, 'Economy'),
('Helen', 'Bennett', 7, 'Economy'),
('Jonathan', 'Gardner', 7, 'Economy'),
('Anna', 'Williamson', 7, 'Economy'),
('Stephen', 'Morris', 7, 'Economy'),
('Brenda', 'Rogers', 7, 'Economy'),
('Larry', 'Cook', 7, 'Economy'),
('Pamela', 'Morgan', 7, 'Economy'),
('Justin', 'Peterson', 7, 'Economy'),
('Katherine', 'Gray', 7, 'Economy'),
-- Flight 8 (DL4444)
('Scott', 'Ramirez', 8, 'Business'),
('Christine', 'James', 8, 'Economy'),
('Brandon', 'Watson', 8, 'Economy'),
('Debra', 'Brooks', 8, 'Economy'),
('Benjamin', 'Chavez', 8, 'First'),
('Rachel', 'Bennett', 8, 'Economy'),
('Samuel', 'Gardner', 8, 'Business'),
('Catherine', 'Williamson', 8, 'Economy'),
('Frank', 'Morris', 8, 'Economy'),
('Janet', 'Rogers', 8, 'Economy'),
-- Flight 9 (LH5555)
('Gregory', 'Cook', 9, 'Economy'),
('Maria', 'Morgan', 9, 'Economy'),
('Alexander', 'Peterson', 9, 'Economy'),
('Diane', 'Gray', 9, 'Economy'),
('Raymond', 'Ramirez', 9, 'Economy'),
('Julie', 'James', 9, 'Economy'),
('Patrick', 'Watson', 9, 'Economy'),
('Joyce', 'Brooks', 9, 'Economy'),
('Jack', 'Chavez', 9, 'Economy'),
('Victoria', 'Bennett', 9, 'Economy'),
-- Flight 10 (CA6666)
('Dennis', 'Gardner', 10, 'Business'),
('Olivia', 'Williamson', 10, 'Economy'),
('Jerry', 'Morris', 10, 'Economy'),
('Ann', 'Rogers', 10, 'Economy'),
('Tyler', 'Cook', 10, 'First'),
('Sophia', 'Morgan', 10, 'Economy'),
('Aaron', 'Peterson', 10, 'Business'),
('Isabella', 'Gray', 10, 'Economy'),
('Jose', 'Ramirez', 10, 'Economy'),
('Ava', 'James', 10, 'Economy');
