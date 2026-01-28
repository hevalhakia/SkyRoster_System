# SkyRoster AI – Flight Roster System: AI Agent Instructions

## Project Overview
**SkyRoster AI** is a flight crew roster management system with 6 multi-screen workflow. The frontend is a vanilla JavaScript/SCSS single-page application (SPA-like) that manages flight crew assignments, seat allocation, and manifest generation. Each HTML page represents a distinct screen in the workflow, with state passed via `sessionStorage`.

## Architecture & Screen Flow

### Six-Screen Workflow (S1–S6)
```
S1 (index.html)           → Login & Authentication
    ↓
S2 (flight-search.html)   → Flight Search & Selection
    ↓
S3 (roster-builder.html)  → Roster Generation & Validation
    ├─→ S4 (seat-assignment.html)    → Drag-and-Drop Seat Assignment
    └─→ S5 (extended-roster.html)    → Crew Edit & Approval
         ↓
S6 (final-manifest.html)  → Final Manifest Display
```

### Screen-Specific Logic Location
All screen initialization and event handling lives in **`src/scripts/index.js`** with dedicated functions:
- `initializeLogin()` – S1 form submission
- `initializeFlightSearch()` – S2 flight list & selection
- `initializeRosterBuilder()` – S3 roster generation, buttons to S4/S5
- `initializeSeatAssignment()` – S4 drag-and-drop, auto-assign logic
- `initializeRosterEdit()` – S5 crew editing, approval submission
- `initializeFinalManifest()` – S6 manifest rendering

**Entry point:** Page detection at bottom of `index.js` checks `window.location.pathname` and calls appropriate init function.

## API Integration

### Backend Server
- **Base URL:** `http://localhost:3000/`
- **Server:** Express.js running on port 3000
- **Database:** MySQL with pool-based connections

### Endpoints & Response Formats

**Authentication:**
- **POST `/auth/login`** → `{ token, user: { user_id, username, role } }`
  - Request: `{ username, password }`
  - Response: JWT token + user object with role

**Flights (Protected - requires Bearer token):**
- **GET `/flights`** → `Array of { flight_id, flight_no, date_time, duration_min, distance_km, vehicle_type, source_airport, destination_airport, partner_flight_no }`
  - No query parameters; client-side filtering used
  - Returns all flights; frontend filters by flightNumber, date, origin, destination, aircraftType

**Cabin Crew (Protected):**
- **GET `/cabincrew`** → `Array of { crew_id, first_name, last_name, crew_rank, base_airport_code, hire_date, active }`
- **POST `/cabincrew`** → Create crew member

**Vehicle Types (Protected):**
- **GET `/vehicletypes`** → Fetch available aircraft types

### Auth Pattern
- JWT token stored in `localStorage.jwtToken`
- Passed in `Authorization: Bearer <token>` header in all protected requests
- JWT expires in 1 hour; token includes: `{ userId, username, role }`

### Frontend-Specific API Handling
- **Roster Generation (S3):** Uses mock data until backend endpoint exists
  - Frontend generates: `{ pilots[], cabinCrew[], passengers[], aircraftCapacity, rules[] }`
- **Seat Assignment (S4):** No backend endpoint; client-side drag-and-drop only
- **Roster Approval (S5):** No backend endpoint; approval simulation only
- **Manifest (S6):** No backend endpoint; displays sessionStorage roster data

### Notes
- Backend does NOT provide roster-related endpoints (`/roster/generate`, `/roster/validate`, `/roster/approve`, `/roster/assign-seats`, `/roster/manifest`)
- These must be either: 1) implemented in backend, or 2) remain client-side only (currently mock)
- CORS configured for `http://localhost:5500` (frontend Live Server origin)

## Data Flow Conventions

### State Management
- **`localStorage`:** Persistent (user login, role)
  - `jwtToken` – JWT authentication token
  - `userRole` – User role (Admin, CrewManager, Pilot, Cabin)
  
- **`sessionStorage`:** Screen-to-screen navigation
  - `currentRosterDraft` – Roster JSON passed S3 → S4/S5
  - `finalRosterManifest` – Approved roster passed S5 → S6

### Cross-Screen Navigation
```javascript
sessionStorage.setItem('currentRosterDraft', JSON.stringify(roster));
window.location.href = 'seat-assignment.html'; // Navigate to S4
```

## Role-Based Access Control (RBAC)

### Global Restriction Logic
Function `applyRoleRestrictions()` called on every page load; enforces visibility rules:

| Role | Visible Buttons | Hidden Buttons |
|------|---|---|
| **Admin / CrewManager** | All (generate, assign, edit, approve) | None |
| **Pilot / Cabin** | Read-only screens (S2, S6) | Generate (S3), Seat Assignment, Edit, Approve |

**Button IDs referenced:**
- `approve-roster-btn` – Approval (S5)
- `generate-roster-btn` – Roster generation (S3)
- `seat-assignment-btn` – Seat assignment link (S3)
- `edit-crew-btn` – Crew edit link (S3)

## Styling & Build

### SCSS Compilation
```bash
npm run sass
```
Watches `src/styles/main.scss` → compiles to `public/styles/main.css`.

### CSS Architecture
- **Variables:** Primary color `#3498db`, error color `#e74c3c`, font stack `Arial, sans-serif`
- **Form styling:** Centered, max-width 350px, white background, rounded corners, shadow
- **Responsive:** Includes viewport meta; grid/flex layouts for seat assignment (details in `main.scss` lines 50–562)

## Code Patterns & Conventions

### Error Handling
```javascript
function displayError(message, status = null) {
    if (loginErrorMessageDiv) {
        let fullMessage = status ? `[${status}] Error: ${message}` : message;
        loginErrorMessageDiv.textContent = fullMessage;
        loginErrorMessageDiv.style.display = 'block'; 
        console.error(fullMessage);
    }
}
```
- Always log to console AND display in UI (error-message div)
- Include HTTP status in error messages when available

### Async/Await Pattern
```javascript
try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` },
        body: JSON.stringify(data)
    });
    if (response.ok) { /* success */ } else { /* error handling */ }
} catch (error) { /* network error */ }
```

### Button Event Listeners
Attach via `getElementById()`, check for null, use arrow functions to preserve context.

## Development Workflow

### Backend Setup (flight-api/)
```bash
cd flight-api
npm install
# Configure MySQL: localhost, apiuser/apipassword, database: new_schemaSkyroster_db
node index.js  # Starts server on http://localhost:3000
```

**Backend File Structure:**
- `index.js` – Express app, CORS, route mounting, MySQL pool setup
- `auth.js` – JWT sign/verify, login endpoint
- `routes/flights.js` – CRUD operations for flights
- `routes/cabinCrew.js` – CRUD for cabin crew
- `routes/vehicleTypes.js`, `routes/menus.js`, `routes/roles.js` – Other data endpoints
- `sql/schema_skyroster.sql` – Database schema initialization

**Key Database Tables:**
- `Users` – user_id, username, password_hash, role
- `Flight` – flight_id, flight_no, date_time, duration_min, distance_km, vehicle_type_id, shared_flight_id
- `Flight_Source` / `Flight_Destination` – Airport references
- `Cabin_Crew` – crew_id, first_name, last_name, crew_rank, base_airport_code, hire_date, active
- `Vehicle_Type` – aircraft types

### Frontend Setup
```bash
# Frontend is in root directory (public/ & src/)
npm install  # Install SASS
npm run sass  # Compile SCSS to CSS
# Serve public/ folder on http://localhost:5500 (Live Server or similar)
```

### Running the Full Stack
1. **Terminal 1:** `cd flight-api && node index.js` (backend on port 3000)
2. **Terminal 2:** `npm run sass` (watch SCSS changes)
3. **Terminal 3:** Serve `public/` directory on http://localhost:5500

### No Build Tools Beyond SASS
- **Bundler:** None – vanilla JS modules loaded directly
- **Test Framework:** Not configured (placeholder in package.json)
- **Package Manager:** npm; `package-lock.json` committed

### Common Tasks
1. **Add new screen:** Create HTML in `public/`, init function in `index.js`, update page detection logic
2. **Add role restriction:** Add button ID + CSS selector to `applyRoleRestrictions()`
3. **Update API endpoint:** Modify constant at top of `index.js` (e.g., `FLIGHT_SEARCH_API_URL`)
4. **Styling:** Edit `src/styles/main.scss`, run `npm run sass`

## File Structure Reference
```
src/
  scripts/index.js       ← All screen logic & API calls
  styles/main.scss       ← All styling (compiled to public/styles/main.css)
public/
  index.html             ← S1 Login
  flight-search.html     ← S2 Flight Search
  roster-builder.html    ← S3 Roster Builder
  seat-assignment.html   ← S4 Seat Assignment
  extended-roster.html   ← S5 Crew Edit & Approval
  final-manifest.html    ← S6 Final Manifest
  styles/main.css        ← Compiled CSS
```

## Key Notes for AI Agents
- **State is ephemeral:** `sessionStorage` clears on tab close; inform users
- **Turkish comments common:** Code includes Turkish (Türkçe) comments; preserve style
- **Incomplete functions:** Many functions have placeholder comments (e.g., "...buraya eklenecektir" = "...to be added here"); fill based on context
- **Manual SASS compilation required:** Updates to `.scss` won't appear until `npm run sass` runs
- **Role checks are UI-only:** Backend should also enforce RBAC; frontend restrictions are UX only
