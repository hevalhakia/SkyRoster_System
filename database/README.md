# 🗄️ Database - MySQL Schema

SkyRoster Flight Roster System veritabanı şeması ve kurulum.

## 📋 İçindekiler

1. [Kurulum](#kurulum)
2. [Tablo Şeması](#tablo-şeması)
3. [Test Verileri](#test-verileri)
4. [SQL Komutları](#sql-komutları)

---

## ⚡ Kurulum

### 1. Veritabanı Oluştur

```bash
mysql -u root -p
```

```sql
CREATE DATABASE new_schemaSkyroster_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Kullanıcı Oluştur

```sql
CREATE USER 'apiuser'@'localhost' IDENTIFIED BY 'apipassword';
GRANT ALL PRIVILEGES ON new_schemaSkyroster_db.* TO 'apiuser'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Schema İçe Aktar

```bash
mysql -u root -p new_schemaSkyroster_db < database/schema_skyroster.sql
```

### 4. Test Verileri Yükle

```bash
mysql -u root -p new_schemaSkyroster_db < database/seed_data.sql
```

---

## 📊 Tablo Şeması

### Users

Sistem kullanıcıları

```sql
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES Role(role_id)
);
```

**Örnek Veriler:**
- admin / admin123 (Admin)
- pilot1 / pilot123 (Pilot)
- crew1 / crew123 (Cabin)

---

### Role

Kullanıcı rolleri

```sql
CREATE TABLE Role (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) UNIQUE NOT NULL
);
```

**Roller:**
- Admin
- CrewManager
- Pilot
- Cabin

---

### Flight

Uçuş bilgileri

```sql
CREATE TABLE Flight (
    flight_id INT PRIMARY KEY AUTO_INCREMENT,
    flight_no VARCHAR(10) UNIQUE NOT NULL,
    date_time DATETIME NOT NULL,
    duration_min INT,
    distance_km INT,
    vehicle_type_id INT,
    source_airport_id INT,
    destination_airport_id INT,
    FOREIGN KEY (vehicle_type_id) REFERENCES Vehicle_Type(vehicle_type_id),
    FOREIGN KEY (source_airport_id) REFERENCES Airport(airport_id),
    FOREIGN KEY (destination_airport_id) REFERENCES Airport(airport_id)
);
```

**Örnek Veriler:**
- TK123 | Boeing 737 | IST → JFK
- LH456 | Airbus A380 | IST → LHR

---

### Cabin_Crew

Kabin görevlileri

```sql
CREATE TABLE Cabin_Crew (
    crew_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    crew_rank VARCHAR(50) NOT NULL,
    base_airport_code VARCHAR(3),
    hire_date DATE,
    active BOOLEAN DEFAULT TRUE
);
```

**Örnekler:**
- Alice Johnson (FA)
- Bob Wilson (FA)
- Carol Davis (Purser)

---

### Vehicle_Type

Uçak tipleri

```sql
CREATE TABLE Vehicle_Type (
    vehicle_type_id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_type_name VARCHAR(100) NOT NULL,
    capacity INT,
    range_km INT
);
```

---

### Airport

Havaalanları

```sql
CREATE TABLE Airport (
    airport_id INT PRIMARY KEY AUTO_INCREMENT,
    airport_code VARCHAR(3) UNIQUE NOT NULL,
    airport_name VARCHAR(100) NOT NULL,
    country VARCHAR(100)
);
```

**Örnekler:**
- IST | Istanbul
- JFK | New York
- LHR | London

---

## 📝 SQL Komutları

### Veritabanını Kontrol Et

```sql
-- Veritabanını seç
USE new_schemaSkyroster_db;

-- Tüm tabloları göster
SHOW TABLES;

-- Tablo yapısını göster
DESCRIBE Flight;
DESC Users;
```

### Veriler Sorgula

```sql
-- Tüm uçuşlar
SELECT * FROM Flight;

-- Tüm kabin görevlileri
SELECT * FROM Cabin_Crew;

-- Tüm roller
SELECT * FROM Role;

-- Tüm havaalanları
SELECT * FROM Airport;
```

### Verileri İçe Aktar

```sql
-- Test verileri yükle
SOURCE database/seed_data.sql;
```

### Veritabanını Yenile

```sql
-- Tüm tabloları sil ve yeniden oluştur
SOURCE database/schema_skyroster.sql;
```

---

## 🧪 Test Verileri

### Varsayılan Kullanıcılar

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| manager | manager123 | CrewManager |
| pilot1 | pilot123 | Pilot |
| crew1 | crew123 | Cabin |

### Varsayılan Uçuşlar

| Flight No | Aircraft | Kalkış | İniş | Saat |
|-----------|----------|--------|------|------|
| TK123 | Boeing 737 | IST | JFK | 10:00 |
| LH456 | Airbus A380 | IST | LHR | 14:30 |

### Varsayılan Kabin Görevlileri

- Alice Johnson (FA, IST)
- Bob Wilson (FA, IST)
- Carol Davis (Purser, IST)
- David Martinez (FA, JFK)
- Emma Thompson (FA, LHR)

---

## 🔄 Backup & Restore

### Backup Oluştur

```bash
mysqldump -u apiuser -p new_schemaSkyroster_db > database_backup.sql
```

### Backup'tan Restore Et

```bash
mysql -u apiuser -p new_schemaSkyroster_db < database_backup.sql
```

---

## ⚠️ Sorun Giderme

### "Access denied" hatası

```bash
# Şifreyi kontrol et
mysql -u apiuser -p new_schemaSkyroster_db

# Veya root olarak:
mysql -u root -p
```

### "Unknown database" hatası

```bash
# Veritabanını kontrol et
mysql -u root -p -e "SHOW DATABASES;"

# Oluştur
mysql -u root -p -e "CREATE DATABASE new_schemaSkyroster_db;"
```

### Foreign Key Constraint Hatası

```sql
-- Foreign Key kontrolü geçici olarak kapat
SET FOREIGN_KEY_CHECKS=0;
-- Verilerinizi temizle
DELETE FROM Flight;
-- Tekrar aç
SET FOREIGN_KEY_CHECKS=1;
```

---

## 📞 Bağlantı Bilgileri

```javascript
// backend/index.js'de
{
  host: 'localhost',
  user: 'apiuser',
  password: 'apipassword',
  database: 'new_schemaSkyroster_db',
  port: 3306
}
```

---

**Son Güncelleme:** 18 Aralık 2025
