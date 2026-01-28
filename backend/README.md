# 🔧 Backend - Express.js API

SkyRoster Flight Roster System için RESTful API sunucusu.

## 📋 İçindekiler

1. [Başlangıç](#başlangıç)
2. [API Endpoints](#api-endpoints)
3. [Authentication](#authentication)
4. [Dosya Yapısı](#dosya-yapısı)

---

## ⚡ Başlangıç

### Kurulum

```bash
cd backend
npm install
node index.js
```

**Beklenen çıktı:**
```
✅ MySQL connected
🚀 Server running on http://localhost:3000
```

### Hızlı Başlat

```bash
# Terminal 1
cd backend
npm install
node index.js

# Sunucu başlatıldı → http://localhost:3000
```

---

## 📡 API Endpoints

### Authentication

#### POST `/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "username": "admin",
    "role": "Admin"
  }
}
```

---

### Flights (Protected - Bearer Token Gerekli)

#### GET `/flights`
Tüm uçuşları getir

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
[
  {
    "flight_id": 1,
    "flight_no": "TK123",
    "date_time": "2025-12-18T10:00:00Z",
    "duration_min": 180,
    "distance_km": 1200,
    "vehicle_type": "Boeing 737",
    "source_airport": "IST",
    "destination_airport": "JFK"
  }
]
```

---

### Cabin Crew (Protected)

#### GET `/cabincrew`
Kabin görevlilerini getir

**Response:**
```json
[
  {
    "crew_id": 1,
    "first_name": "Alice",
    "last_name": "Johnson",
    "crew_rank": "FA",
    "base_airport_code": "IST",
    "hire_date": "2020-01-15",
    "active": true
  }
]
```

#### POST `/cabincrew`
Yeni kabin görevlisi ekle

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "crew_rank": "FA",
  "base_airport_code": "IST",
  "hire_date": "2025-01-01"
}
```

---

### Vehicle Types (Protected)

#### GET `/vehicletypes`
Uçak tiplerini getir

**Response:**
```json
[
  {
    "vehicle_type_id": 1,
    "vehicle_type_name": "Boeing 737",
    "capacity": 180
  }
]
```

---

## 🔐 Authentication

### JWT Token Flow

1. **Login İsteği** → `/auth/login`
2. **Token Alınır** → `localStorage.setItem('jwtToken', token)`
3. **Protected Requests** → `Authorization: Bearer <TOKEN>`
4. **Token Geçerliliği** → 1 saat

---

## 📁 Dosya Yapısı

```
backend/
├── index.js                 # Ana server
├── auth.js                  # JWT middleware
├── package.json
├── routes/
│   ├── flights.js           # GET /flights
│   ├── cabinCrew.js         # GET /cabincrew
│   ├── vehicleTypes.js      # GET /vehicletypes
│   ├── roster.js
│   ├── passengers.js
│   ├── menus.js
│   └── roles.js
└── README.md                # Bu dosya
```

---

## 🗄️ Veritabanı Bağlantısı

### Konfigürasyon (index.js)

```javascript
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'apiuser',
    password: 'apipassword',
    database: 'new_schemaSkyroster_db'
});
```

### CORS Whitelist

```javascript
app.use(cors({
    origin: ['http://localhost:5501', 'http://localhost:5500'],
    credentials: true
}));
```

---

## 🧪 Testing

### cURL Examples

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Get Flights:**
```bash
curl -X GET http://localhost:3000/flights \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📞 Test Kredileri

```
Username: admin
Password: admin123
```

**Sonraki adım:** [Frontend'i başlat](../frontend/README.md)

---

**Son Güncelleme:** 18 Aralık 2025
