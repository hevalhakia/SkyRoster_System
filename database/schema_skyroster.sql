-- ============================
--  VERİTABANI OLUŞTUR / SEÇ
-- ============================
SET SQL_SAFE_UPDATES = 0;

CREATE DATABASE IF NOT EXISTS new_schemaSkyroster_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE new_schemaSkyroster_db;

-- ============================
--  VARSA ESKİ TABLOLARI SİL (OPSİYONEL SIFIRLAMA)
-- ============================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Role_Menu_Permission;
DROP TABLE IF EXISTS Menu;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Role;
DROP TABLE IF EXISTS Flight_Source;
DROP TABLE IF EXISTS Flight_Destination;
DROP TABLE IF EXISTS Flight;
DROP TABLE IF EXISTS Shared_Flight;
DROP TABLE IF EXISTS Cabin_Crew;
DROP TABLE IF EXISTS Vehicle_Type;
DROP TABLE IF EXISTS Airport;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================
--  TABLOLAR
-- ============================

CREATE TABLE IF NOT EXISTS Airport (
    airport_code CHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Vehicle_Type (
    vehicle_type_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    seat_count INT NOT NULL,
    seat_map JSON NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Shared_Flight (
    shared_flight_id INT AUTO_INCREMENT PRIMARY KEY,
    partner_flight_no VARCHAR(6) NOT NULL,
    partner_airline VARCHAR(100) NOT NULL,
    connection_info TEXT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Flight (
    flight_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_no VARCHAR(6) NOT NULL UNIQUE,
    date_time DATETIME NOT NULL,
    duration_min INT NOT NULL,
    distance_km INT NOT NULL,
    vehicle_type_id INT NOT NULL,
    shared_flight_id INT,
    FOREIGN KEY (vehicle_type_id) REFERENCES Vehicle_Type(vehicle_type_id),
    FOREIGN KEY (shared_flight_id) REFERENCES Shared_Flight(shared_flight_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Flight_Source (
    flight_id INT PRIMARY KEY,
    airport_code CHAR(3) NOT NULL,
    FOREIGN KEY (flight_id) REFERENCES Flight(flight_id) ON DELETE CASCADE,
    FOREIGN KEY (airport_code) REFERENCES Airport(airport_code)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Flight_Destination (
    flight_id INT PRIMARY KEY,
    airport_code CHAR(3) NOT NULL,
    FOREIGN KEY (flight_id) REFERENCES Flight(flight_id) ON DELETE CASCADE,
    FOREIGN KEY (airport_code) REFERENCES Airport(airport_code)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Cabin_Crew (
  crew_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  crew_rank VARCHAR(50),
  base_airport_code CHAR(3),
  hire_date DATE,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (base_airport_code) REFERENCES Airport(airport_code)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Passenger (
  passenger_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  passport_number VARCHAR(20),
  passenger_type ENUM('ADULT', 'CHILD', 'INFANT') DEFAULT 'ADULT',
  parent_passenger_id INT,
  ticket_class VARCHAR(20) DEFAULT 'Economy',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_passenger_id) REFERENCES Passenger(passenger_id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Flight_Crew (
  flight_id INT NOT NULL,
  crew_id INT NOT NULL,
  crew_role VARCHAR(50),
  PRIMARY KEY (flight_id, crew_id),
  FOREIGN KEY (flight_id) REFERENCES Flight(flight_id) ON DELETE CASCADE,
  FOREIGN KEY (crew_id) REFERENCES Cabin_Crew(crew_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Flight_Passenger (
  flight_id INT NOT NULL,
  passenger_id INT NOT NULL,
  assigned_seat VARCHAR(10),
  check_in_status VARCHAR(20) DEFAULT 'PENDING',
  PRIMARY KEY (flight_id, passenger_id),
  FOREIGN KEY (flight_id) REFERENCES Flight(flight_id) ON DELETE CASCADE,
  FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Role (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES Role(role_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Menu (
  menu_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  path VARCHAR(255) NOT NULL,
  parent_menu_id INT DEFAULT NULL,
  FOREIGN KEY (parent_menu_id) REFERENCES Menu(menu_id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Role_Menu_Permission (
  role_id INT NOT NULL,
  menu_id INT NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (role_id, menu_id),
  FOREIGN KEY (role_id) REFERENCES Role(role_id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id) REFERENCES Menu(menu_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================
--  ROSTER STORAGE (SQL)
--  Stores roster JSON payloads as a single document
-- ============================

CREATE TABLE IF NOT EXISTS Roster_Store (
  storage_id INT AUTO_INCREMENT PRIMARY KEY,
  flight_id INT NULL,
  storage_type VARCHAR(10) NOT NULL,
  roster_json LONGTEXT NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================
--  ÖRNEK VERİLER (MOCK DATA)
-- ============================

-- Role verileri (önce role eklenmeli)
INSERT INTO Role (role_id, role_name, description) VALUES
(1, 'admin', 'Tüm sistem üzerinde tam yetkili kullanıcı'),
(2, 'planner', 'Uçuş ve ekip planlama yetkisine sahip kullanıcı'),
(3, 'viewer', 'Sadece görüntüleme yetkisine sahip kullanıcı');

-- Users: admin kullanıcısı
-- Şifre: admin123  (auth.js ile birebir uyumlu)
INSERT INTO Users (username, password_hash, role_id) VALUES
('admin', 'admin123', 1);

-- Airport verileri
INSERT INTO Airport (airport_code, name, city, country) VALUES
('IST', 'Istanbul Airport', 'Istanbul', 'Turkey'),
('LHR', 'Heathrow Airport', 'London', 'UK'),
('FRA', 'Frankfurt Airport', 'Frankfurt', 'Germany'),
('JFK', 'John F. Kennedy International Airport', 'New York', 'USA'),
('CDG', 'Charles de Gaulle Airport', 'Paris', 'France'),
('FCO', 'Leonardo da Vinci–Fiumicino Airport', 'Rome', 'Italy'),
('TXL', 'Berlin Tegel Airport', 'Berlin', 'Germany');

-- Vehicle_Type verileri
INSERT INTO Vehicle_Type (name, seat_count, seat_map) VALUES
('Boeing 737', 160, '{"rows": 27, "seatsPerRow": 6}'),
('Airbus A320', 150, '{"rows": 25, "seatsPerRow": 6}');

-- Shared_Flight verileri
INSERT INTO Shared_Flight (partner_flight_no, partner_airline, connection_info) VALUES
('AF123', 'Air France', 'Connection info example'),
('BA456', 'British Airways', 'Connection info example');

-- Flight verileri
INSERT INTO Flight (flight_no, date_time, duration_min, distance_km, vehicle_type_id, shared_flight_id) VALUES
('TK123', '2025-12-01 10:00:00', 150, 2500, 1, NULL),
('LH456', '2025-12-02 14:00:00', 240, 6200, 2, 1);

-- Flight_Source verileri
INSERT INTO Flight_Source (flight_id, airport_code) VALUES
(1, 'IST'),
(2, 'FRA');

-- Flight_Destination verileri
INSERT INTO Flight_Destination (flight_id, airport_code) VALUES
(1, 'LHR'),
(2, 'JFK');

-- Cabin_Crew verileri
INSERT INTO Cabin_Crew (first_name, last_name, crew_rank, base_airport_code, hire_date, active) VALUES
('Jane', 'Smith', 'Flight Attendant', 'LHR', '2021-06-01', TRUE),
('Mike', 'Johnson', 'Senior Flight Attendant', 'JFK', '2019-09-15', TRUE);

-- Menu verileri
INSERT INTO Menu (menu_id, name, path, parent_menu_id) VALUES
(1, 'Dashboard', '/dashboard', NULL),
(2, 'Flights', '/flights', NULL),
(3, 'Create Flight', '/flights/create', 2),
(4, 'Cabin Crew', '/cabincrew', NULL),
(5, 'Vehicle Types', '/vehicletypes', NULL),
(6, 'Airports', '/airports', NULL),
(7, 'Roles', '/admin/roles', NULL),
(8, 'Menus', '/admin/menus', NULL),
(9, 'Users', '/admin/users', NULL);

-- Role_Menu_Permission verileri
INSERT INTO Role_Menu_Permission (role_id, menu_id, can_view, can_edit) VALUES
-- admin: her şeye tam yetki
(1, 1, TRUE, TRUE),
(1, 2, TRUE, TRUE),
(1, 3, TRUE, TRUE),
(1, 4, TRUE, TRUE),
(1, 5, TRUE, TRUE),
(1, 6, TRUE, TRUE),
(1, 7, TRUE, TRUE),
(1, 8, TRUE, TRUE),
(1, 9, TRUE, TRUE),

-- planner
(2, 1, TRUE, FALSE),
(2, 2, TRUE, TRUE),
(2, 3, TRUE, TRUE),
(2, 4, TRUE, TRUE),
(2, 5, TRUE, TRUE),
(2, 6, TRUE, FALSE),
(2, 7, FALSE, FALSE),
(2, 8, FALSE, FALSE),
(2, 9, FALSE, FALSE),

-- viewer
(3, 1, TRUE, FALSE),
(3, 2, TRUE, FALSE),
(3, 4, TRUE, FALSE),
(3, 5, TRUE, FALSE),
(3, 6, TRUE, FALSE);

-- ============================
--  DB USER AYARLARI
-- ============================

-- NOTE: Skipping user creation/grants in schema file to avoid privilege errors during import.
-- DROP USER IF EXISTS 'apiuser'@'localhost';
-- CREATE USER IF NOT EXISTS 'apiuser'@'localhost' IDENTIFIED BY 'apipassword';
-- GRANT ALL PRIVILEGES ON new_schemaSkyroster_db.* TO 'apiuser'@'localhost';
-- FLUSH PRIVILEGES;

-- ============================
--  ROSTER TABLES
-- ============================

CREATE TABLE IF NOT EXISTS Roster (
  roster_id INT AUTO_INCREMENT PRIMARY KEY,
  flight_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT,
  FOREIGN KEY (flight_id) REFERENCES Flight(flight_id),
  FOREIGN KEY (approved_by) REFERENCES Users(user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Roster_Assignment (
  assignment_id INT AUTO_INCREMENT PRIMARY KEY,
  roster_id INT NOT NULL,
  crew_id INT NOT NULL,
  position VARCHAR(30),
  FOREIGN KEY (roster_id) REFERENCES Roster(roster_id),
  FOREIGN KEY (crew_id) REFERENCES Cabin_Crew(crew_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
