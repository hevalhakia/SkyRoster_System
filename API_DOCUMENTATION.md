# 📡 API Uçnoktaları Belgelendirmesi

SkyRoster API tam başvuru kılavuzu.

---

## Temel URL

```
http://localhost:3000
```

---

## Yetkilendirme

### Giriş

```http
POST /auth/login
Content-Type: application/json

{
  "email": "pilot@skyroster.com",
  "password": "password123"
}
```

**Yanıt (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "pilot@skyroster.com",
    "role": "PILOT"
  }
}
```

---

## Uçuşlar

### Tüm Uçuşları Al

```http
GET /api/flights
Authorization: Bearer <token>
```

**Yanıt (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "flightNumber": "TK123",
      "aircraftId": 5,
      "departureAirport": "IST",
      "arrivalAirport": "JFK",
      "departureTime": "2025-12-28T10:00:00Z",
      "status": "SCHEDULED"
    }
  ]
}
```

### Uçuş ID'sine Göre Al

```http
GET /api/flights/:id
Authorization: Bearer <token>
```

---

## Roster (Ekip Planı)

### Roster Oluştur

```http
POST /api/roster/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "flightId": 1,
  "cabinCrewCount": 4
}
```

**Yanıt (200):**
```json
{
  "id": 10,
  "flightId": 1,
  "crew": [...],
  "status": "DRAFT"
}
```

### Roster Al

```http
GET /api/roster/:id
Authorization: Bearer <token>
```

### Roster Güncelle

```http
PUT /api/roster/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "CONFIRMED",
  "cabinCrewIds": [3, 4, 5]
}
```

---

## Koltuk Ataması

### Yolcuları Al

```http
GET /api/flights/:flightId/passengers
Authorization: Bearer <token>
```

### Koltukları Ata

```http
POST /api/flights/:flightId/assign-seats
Authorization: Bearer <token>
Content-Type: application/json

{
  "assignments": [
    {
      "passengerId": 101,
      "seatNumber": "1A"
    }
  ]
}
```

**Yanıt (200):**
```json
{
  "success": true,
  "assignedCount": 10
}
```

---

## Manifest

### Manifestoyu Al

```http
GET /api/flights/:flightId/manifest
Authorization: Bearer <token>
```

### Manifestoyu İndir

```http
GET /api/flights/:flightId/manifest/export?format=pdf
Authorization: Bearer <token>
```

---

## Kabin Ekibi

### Kabin Ekibini Listele

```http
GET /api/cabincrew
Authorization: Bearer <token>
```

### Yeni Kabin Ekibi Ekle

```http
POST /api/cabincrew
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Fatma Korkmaz",
  "role": "FLIGHT_ATTENDANT",
  "experience": 5
}
```

---

## Hata Yanıtları

### 400 - Geçersiz İstek

```json
{
  "success": false,
  "error": "Geçersiz parametreler"
}
```

### 401 - Yetkisiz

```json
{
  "success": false,
  "error": "Yetkisiz erişim"
}
```

### 404 - Bulunamadı

```json
{
  "success": false,
  "error": "Kaynak bulunamadı"
}
```

### 500 - Sunucu Hatası

```json
{
  "success": false,
  "error": "Sunucu hatası oluştu"
}
```

---

## Test Komutları

```bash
# Giriş yap
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pilot@skyroster.com","password":"password123"}'

# Uçuşları listele
curl -X GET http://localhost:3000/api/flights \
  -H "Authorization: Bearer <token>"

# Roster oluştur
curl -X POST http://localhost:3000/api/roster/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"flightId":1,"cabinCrewCount":4}'
```

---

**Sürüm:** 1.0  
**Son Güncelleme:** 28 Aralık 2024
