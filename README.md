# ✈️ SkyRoster - Flight Crew Roster Management System

Profesyonel uçuş ekibi planlama ve manifest yönetim sistemi.

**Status:** ✅ Çalışan Proje  
**Teknoloji:** Vanilla JS + Express.js + MySQL  
**Test:** 80+ test case

---

## 🎯 Proje Yapısı

```
SkyRoster/
├── frontend/                # Frontend (HTML + JS + SCSS)
│   ├── public/              # Web dosyaları
│   ├── src/                 # SCSS kaynakları
│   └── README.md            # Frontend kılavuzu
│
├── backend/                 # API Sunucusu (Express.js)
│   ├── routes/              # API route'ları
│   ├── index.js             # Server dosyası
│   └── README.md            # Backend kılavuzu
│
├── database/                # MySQL Veritabanı
│   ├── schema_skyroster.sql # Tablo tanımları
│   ├── seed_data.sql        # Test verileri
│   └── README.md            # Database kılavuzu
│
├── postman/                 # API Testing
│   └── skyroster-flight-api.postman_collection.json
│
├── SETUP_GUIDE.md           # Detaylı Kurulum Kılavuzu
├── package.json             # Proje bağımlılıkları
└── README.md                # Bu dosya
```

---

## ⚡ Hızlı Kurulum (10 dakika)

### Adım 1: Bağımlılıkları Yükle

```bash
npm install
```

### Adım 2: Veritabanını Kur

```bash
# MySQL'de
mysql -u root -p

# Aşağıdaki SQL'i çalıştır:
CREATE DATABASE new_schemaSkyroster_db;
CREATE USER 'apiuser'@'localhost' IDENTIFIED BY 'apipassword';
GRANT ALL PRIVILEGES ON new_schemaSkyroster_db.* TO 'apiuser'@'localhost';
FLUSH PRIVILEGES;
```

### Adım 3: Verileri İçe Aktar

```bash
mysql -u root -p new_schemaSkyroster_db < database/schema_skyroster.sql
mysql -u root -p new_schemaSkyroster_db < database/seed_data.sql
```

### Adım 4: Sunucuları Başlat

**Terminal 1 - Backend:**
```bash
cd backend
npm install
node index.js
# Çalışıyor: http://localhost:3000
```

**Terminal 2 - Frontend SCSS Watch:**
```bash
npm run sass
```

**Terminal 3 - Frontend Web Server:**
```bash
npx http-server frontend/public -p 5501
# Açın: http://localhost:5501/index.html
```

### Adım 5: Test Et

```
Login: admin / admin123
```

---

## 📚 Detaylı Kılavuzlar

### Setup & Installation
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Adım adım kurulum talimatları

### Bileşen Rehberleri
- **[frontend/README.md](frontend/README.md)** - Frontend mimarisi ve geliştirme
- **[backend/README.md](backend/README.md)** - API endpoints ve authentication
- **[database/README.md](database/README.md)** - Veritabanı şeması

---

## 🎬 6-Screen Workflow

```
S1: Login
   ↓ (JWT Token)
S2: Flight Search
   ↓ (Uçuş Seçimi)
S3: Roster Builder
   ├→ S4: Seat Assignment (AUTO-ASSIGN)
   └→ S5: Crew Approval
        ↓ (Onay)
S6: Final Manifest
   └→ Print & Download
```

### Sayfalar

| Screen | Dosya | Fonksiyon |
|--------|-------|----------|
| S1 | `index.html` | Giriş / JWT |
| S2 | `flight-search.html` | Uçuş seçimi |
| S3 | `roster-builder.html` | Roster oluştur |
| S4 | `seat-assignment.html` | Koltuk ataması |
| S5 | `extended-roster.html` | Onay |
| S6 | `final-manifest.html` | Manifest |

---

## 🔐 Authentication

### Default Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| manager | manager123 | CrewManager |
| pilot1 | pilot123 | Pilot |
| crew1 | crew123 | Cabin |

### JWT Token

- **Validity:** 1 saat
- **Storage:** `localStorage.jwtToken`
- **Use:** `Authorization: Bearer <TOKEN>`

---

## 🛠️ Teknoloji Stack

### Frontend
- **HTML5** - Semantic markup
- **Vanilla JavaScript** - Hiç framework
- **SCSS** - Modern styling
- **CSS Grid** - Responsive layout

### Backend
- **Express.js** - RESTful API
- **MySQL** - Veritabanı
- **JWT** - Authentication
- **CORS** - Cross-origin requests

### Database
- **MySQL 8.0+**
- **11 Tablo** (Users, Flights, Crew, vb.)
- **Relations & Constraints**

---

## 📡 API Endpoints

### Authentication
```
POST /auth/login
Body: { username, password }
Response: { token, user }
```

### Protected Routes (Bearer Token)
```
GET /flights              → Tüm uçuşlar
GET /cabincrew            → Kabin görevlileri
GET /vehicletypes         → Uçak tipleri
POST /cabincrew           → Yeni crew ekle
```

---

## 🚀 Development

### Edit Frontend

```bash
# JavaScript
nano frontend/public/main.js

# SCSS Styling
nano frontend/src/styles/main.scss

# Auto-compile SCSS
npm run sass
```

### Edit Backend

```bash
# API Routes
nano backend/routes/flights.js

# Main Server
nano backend/index.js

# Restart
cd backend
node index.js
```

### Edit Database

```bash
# SQL Queries
mysql -u apiuser -p new_schemaSkyroster_db

mysql> SELECT * FROM Flight;
mysql> SELECT * FROM Cabin_Crew;
```

---

## 🧪 Testing

### Manual Testing

1. **Login:** admin/admin123
2. **Select Flight:** TK123
3. **Generate Roster:** AUTO-GENERATE
4. **Assign Seats:** AUTO-ASSIGN (A1, A2, A3)
5. **Approve:** APPROVE butonuyla
6. **View Manifest:** Final sayfaya git
7. **Export:** Print/Download test et

### API Testing (Postman)

```
postman/skyroster-flight-api.postman_collection.json
```

---

## 📊 Proje Durumu

✅ **Tamamlandı:**
- Login & Authentication (S1)
- Flight Search (S2)
- Roster Generation (S3)
- Seat Assignment (S4)
- Crew Approval (S5)
- Final Manifest (S6)
- RBAC Implementation
- MySQL Integration

⏳ **İsteğe Bağlı (Frontend'de Mock):**
- Roster backend endpoints
- Advanced seat features
- Analytics & Reports

---

## 📞 Sorun Giderme

### MySQL Bağlantısı Hatası
```bash
brew services start mysql@8.0  # macOS
sudo systemctl start mysql      # Linux
```

### Port Zaten Kullanılıyor
```bash
lsof -i :3000
lsof -i :5501
```

### SCSS Derlenmiyor
```bash
npm run sass
```

Detaylı tüm hatalar için: [SETUP_GUIDE.md](SETUP_GUIDE.md#sorun-giderme)

---

## 📖 Rehberler

| Dosya | İçerik |
|-------|--------|
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | **Baştan sona kurulum** |
| [frontend/README.md](frontend/README.md) | Frontend mimarisi |
| [backend/README.md](backend/README.md) | API dokümantasyonu |
| [database/README.md](database/README.md) | Veritabanı şeması |

---

## 🤝 Ekip Geliştirme

Bu proje ekip tarafından geliştirileyor. Dosyaları paylaş:

```bash
# Dosyaları sıkıştır
zip -r SkyRoster.zip SkyRoster/

# Veya GitHub'a push et
git add .
git commit -m "Project ready"
git push origin main
```

---

## ✨ Özellikler

- ✅ 6-ekranlı tam iş akışı
- ✅ JWT authentication
- ✅ Role-based access (Admin/Manager/Pilot/Cabin)
- ✅ Real-time flight data
- ✅ Auto seat assignment
- ✅ PDF print export
- ✅ CSV download
- ✅ Responsive design
- ✅ Error handling
- ✅ Data persistence (sessionStorage + localStorage)

---

## 📝 Dosya İstatistikleri

- **Frontend:** 1046 satır JavaScript + 500+ satır SCSS
- **Backend:** ~200 satır Express.js + 7 route dosyası
- **Database:** 11 tablo, 50+ test verisi
- **Toplam:** 2000+ satır kod

---

## 🚀 Production Ready?

**Evet, şu şartlar altında:**
1. ✅ Backend production server'da çalışsın
2. ✅ MySQL'in secured olması
3. ✅ HTTPS/SSL konfigürasyonu
4. ✅ Environment variables (.env)
5. ✅ Backup & monitoring

---

## 📞 İletişim & Destek

Sorunlar veya sorular için:

1. [SETUP_GUIDE.md](SETUP_GUIDE.md#sorun-giderme) kontrol et
2. Konsol hata mesajlarını oku (`F12` → Console)
3. MySQL bağlantısını doğrula
4. SCSS derlenmesini kontrol et

---

**Versiyon:** 1.0.0  
**Son Güncelleme:** 18 Aralık 2025  
**Status:** ✅ Üretim Hazır
