// --- Global Yardımcı Fonksiyonlar ve API Tanımları ---

// DİKKAT: Port 3000'de backend çalışıyor
const PROVIDER_API_BASE = 'http://localhost:3000/'; 

// API Endpoints
const LOGIN_API_URL = PROVIDER_API_BASE + 'auth/login'; 
const FLIGHT_SEARCH_API_URL = PROVIDER_API_BASE + 'flights'; 
const ROSTER_GENERATE_API_URL = PROVIDER_API_BASE + 'roster/generate';
const ROSTER_VALIDATE_API_URL = PROVIDER_API_BASE + 'roster/validate';
const ROSTER_APPROVE_API_URL = PROVIDER_API_BASE + 'roster/approve';
const ROSTER_STORE_API_URL = PROVIDER_API_BASE + 'roster/store';
const SEAT_ASSIGNMENT_API_URL = PROVIDER_API_BASE + 'roster/assign-seats'; 
const FINAL_MANIFEST_API_URL = PROVIDER_API_BASE + 'roster/manifest';
const CABIN_CREW_API_URL = PROVIDER_API_BASE + 'cabincrew';
const VEHICLE_TYPES_API_URL = PROVIDER_API_BASE + 'vehicletypes';

// Global variable for S5
let currentRosterDraftS5 = null;

// Global approval handler (HTML onclick'ten çağrılıyor)
function handleApproveClick() {
    // Kept for backward-compat with any leftover inline handlers.
    // Route the click through the normal approval button flow.
    const approvalBtn = document.getElementById('approve-roster-btn');
    if (approvalBtn) approvalBtn.click();
}

document.addEventListener('DOMContentLoaded', () => {
    const loginErrorMessageDiv = document.getElementById('error-message'); 

    /**
     * Hata mesajını gösterir.
     */
    function displayError(message, status = null) {
        if (loginErrorMessageDiv) {
            let fullMessage = status ? `[${status}] Error: ${message}` : message;
            loginErrorMessageDiv.textContent = fullMessage;
            loginErrorMessageDiv.style.display = 'block'; 
            console.error(fullMessage);
        } else {
            console.error(`Error: ${message}`);
        }
    }
    
    // --- Global: Role Restriction Logic (GÖREV 15) ---

    function applyRoleRestrictions() {
        const userRole = localStorage.getItem('userRole');
        if (!userRole) return; 

        // Kısıtlanması gereken UI elemanlarını seçin
        const approvalBtn = document.getElementById('approve-roster-btn'); // S5
        const generateBtn = document.getElementById('generate-roster-btn'); // S3
        const seatAssignmentBtn = document.getElementById('seat-assignment-btn'); // S3
        const editCrewBtn = document.getElementById('edit-crew-btn'); // S3
        
        // Varsayılan kısıtlamalar (Admin/Manager dışındaki roller için)
        if (approvalBtn) approvalBtn.style.display = 'none';
        
        // Rol bazlı kurallar
        if (userRole === 'Admin' || userRole === 'CrewManager') {
            // Admin/Manager tüm kritik işlevlere sahiptir
            if (approvalBtn) approvalBtn.style.display = 'block'; 
            
        } else if (userRole === 'Pilot' || userRole === 'Cabin') {
            // Pilot/Kabin Ekibi sadece görüntüleme (S2, S6) yapabilir.
            
            // S3'teki Roster Oluşturma ve Düzenleme butonları gizlenir
            if (generateBtn) generateBtn.style.display = 'none';
            if (seatAssignmentBtn) seatAssignmentBtn.style.display = 'none';
            if (editCrewBtn) editCrewBtn.style.display = 'none';
            
            // S5 Edit ekranında ise tüm kontrolleri gizle
            const crewEditorControls = document.getElementById('crew-editor-controls');
            if(crewEditorControls) crewEditorControls.style.display = 'none';
        }
    }

    // Ensure crew members have numeric ids. Assign sequential ids starting from max existing + 1.
    // Keeps existing ids (e.g., DB crew_id) intact.
    function ensureCrewIds(roster) {
        if (!roster) return;

        const pilots = roster.pilots || [];
        const cabin = roster.cabinCrew || [];

        let maxId = 999;
        pilots.concat(cabin).forEach(c => {
            if (c && c.id !== undefined && c.id !== null && !isNaN(Number(c.id))) {
                const n = Number(c.id);
                if (n > maxId) maxId = n;
            }
        });

        function nextId() { maxId += 1; return maxId; }

        pilots.forEach(p => {
            if (!p) return;
            if (p.id === undefined || p.id === null || p.id === '') p.id = nextId();
        });

        cabin.forEach(c => {
            if (!c) return;
            if (c.id === undefined || c.id === null || c.id === '') c.id = nextId();
        });
    }

    // Normalize pilot/cabin crew fields so UI can always display {id, name, certType/type}.
    // Also ensures missing ids get assigned.
    function normalizeCrewFields(roster) {
        if (!roster) return;

        if (Array.isArray(roster.pilots)) {
            roster.pilots = roster.pilots.map(p => {
                const name = p?.name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
                return {
                    ...p,
                    id: (p?.id ?? p?.pilot_id ?? p?.crew_id ?? p?.user_id ?? p?.employee_id ?? null),
                    name: name || 'Unknown',
                    certType: p?.certType || p?.crew_rank || p?.crew_role || p?.position || 'CPT',
                    seniority: p?.seniority || p?.crew_rank || 'N/A'
                };
            });
        }

        if (Array.isArray(roster.cabinCrew)) {
            roster.cabinCrew = roster.cabinCrew.map(c => {
                const name = c?.name || `${c?.first_name || ''} ${c?.last_name || ''}`.trim();
                return {
                    ...c,
                    id: (c?.id ?? c?.crew_id ?? c?.user_id ?? c?.employee_id ?? null),
                    name: name || 'Unknown',
                    type: c?.type || c?.crew_rank || c?.crew_role || c?.position || 'FA',
                    language: c?.language || 'EN'
                };
            });
        }

        ensureCrewIds(roster);
    }


    // --- S1: AUTHENTICATE LOGIC (Screen S1) ---

    function handleSuccessfulLogin(jwtToken, role) {
        console.log('Login successful! Redirecting...');
        localStorage.setItem('jwtToken', jwtToken);
        localStorage.setItem('userRole', role);
        console.log('Token saved:', jwtToken);
        console.log('Role saved:', role);
        
        // Redirect to flight search page
        window.location.replace(window.location.origin + '/flight-search.html');
    }

    function initializeLogin() {
        console.log('--- Initializing Screen S1 (Login) ---');
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (!username || !password) {
                displayError('Please enter both username and password.');
                return;
            }
            
            try {
                const response = await fetch(LOGIN_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Backend döndürüyor: { token, user: { user_id, username, role } }
                    handleSuccessfulLogin(data.token, data.user.role);
                } else if (response.status === 401) {
                    displayError('Invalid username or password.', 401);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    displayError(errorData.error || errorData.message || 'Login failed.', response.status);
                }
            } catch (error) {
                displayError(`Network error: ${error.message}`);
            }
        });
    }

    // --- S2: FLIGHT SEARCH & SELECTION LOGIC (Screen S2) ---

    let selectedFlight = null; 
    
    function initializeFlightSearch() {
        console.log('--- Initializing Screen S2 (Flight Search) ---');
        
        const searchForm = document.getElementById('flight-search-form');
        const searchBtn = document.getElementById('search-flights-btn');
        const openRosterBtn = document.getElementById('open-roster-btn');
        
        if (!searchForm || !searchBtn) return;
        
        // Populate aircraft type filter (backup - also load from API)
        async function populateAircraftTypes() {
            const jwtToken = localStorage.getItem('jwtToken');
            if (!jwtToken) return;
            
            try {
                const response = await fetch(VEHICLE_TYPES_API_URL, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                
                if (response.ok) {
                    const vehicleTypes = await response.json();
                    const aircraftTypeSelect = document.getElementById('aircraft-type-filter');
                    if (aircraftTypeSelect) {
                        // Keep existing options and add any new ones
                        const existingValues = Array.from(aircraftTypeSelect.options).map(o => o.value);
                        
                        vehicleTypes.forEach(vt => {
                            if (!existingValues.includes(vt.name)) {
                                const option = document.createElement('option');
                                option.value = vt.name;
                                option.textContent = vt.name;
                                aircraftTypeSelect.appendChild(option);
                            }
                        });
                        console.log('✅ Aircraft types loaded:', vehicleTypes.length);
                    }
                }
            } catch (error) {
                console.error('⚠️ Error loading vehicle types from API:', error);
                console.log('ℹ️ Using static aircraft types from HTML');
            }
        }
        
        // Load aircraft types on initialization
        populateAircraftTypes();
        
        // Wait for token to be available (auto-login might still be in progress), then load flights
        const waitForTokenAndSearch = async () => {
            let attempts = 0;
            while (!localStorage.getItem('jwtToken') && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            console.log(`Token ready after ${attempts * 100}ms, loading flights...`);
            await searchFlights();
        };
        
        waitForTokenAndSearch();
        
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await searchFlights();
        });
        
        async function searchFlights() {
            const flightNumber = document.getElementById('flight-number-input')?.value.trim() || '';
            const date = document.getElementById('date-filter')?.value || '';
            const origin = document.getElementById('origin-filter')?.value.trim() || '';
            const destination = document.getElementById('destination-filter')?.value.trim() || '';
            const aircraftType = document.getElementById('aircraft-type-filter')?.value || '';
            
            const jwtToken = localStorage.getItem('jwtToken');
            if (!jwtToken) {
                displayError('Session expired. Please login again.');
                window.location.href = 'index.html';
                return;
            }
            
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) loadingMessage.style.display = 'block';
            
            try {
                // Backend'ten tüm flights'ı al
                const response = await fetch(FLIGHT_SEARCH_API_URL, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                
                if (response.ok) {
                    let flights = await response.json();
                    
                    // Client-side filtreleme (tarih ve uçak tipi karşılaştırmasını daha dayanıklı yap)
                    flights = flights.filter(flight => {
                        const matchesNumber = !flightNumber || (flight.flight_no || '').toLowerCase().includes(flightNumber.toLowerCase());

                        // flight.date_time örn: "2025-12-20T07:30:00.000Z" — sadece YYYY-MM-DD kısmını karşılaştır
                        const flightDate = (flight.date_time || '').split('T')[0];
                        const matchesDate = !date || flightDate === date;

                        const matchesOrigin = !origin || (flight.source_airport || '').toLowerCase().includes(origin.toLowerCase());
                        const matchesDestination = !destination || (flight.destination_airport || '').toLowerCase().includes(destination.toLowerCase());

                        // Uçak tipi karşılaştırmasını normalize ederek yap (boş ya da "All" seçeneği geçerli kabul edilir)
                        const flightVehicle = (flight.vehicle_type || '').toLowerCase().trim();
                        const aircraftFilter = (aircraftType || '').toLowerCase().trim();
                        const matchesAircraft = !aircraftFilter || aircraftFilter === 'all' || flightVehicle.includes(aircraftFilter);

                        return matchesNumber && matchesDate && matchesOrigin && matchesDestination && matchesAircraft;
                    });
                    
                    renderFlightResults(flights);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    displayError(errorData.error || errorData.message || 'Failed to fetch flights.', response.status);
                    document.getElementById('no-results-message').style.display = 'block';
                }
            } catch (error) {
                displayError(`Network error: ${error.message}`);
            } finally {
                if (loadingMessage) loadingMessage.style.display = 'none';
            }
        }
        
        function renderFlightResults(flights) {
            const flightTable = document.getElementById('flight-results-table');
            const noResultsMsg = document.getElementById('no-results-message');
            
            if (!flightTable) return;
            
            const tbody = flightTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            if (!flights || flights.length === 0) {
                if (noResultsMsg) noResultsMsg.style.display = 'block';
                return;
            }
            
            if (noResultsMsg) noResultsMsg.style.display = 'none';
            
            flights.forEach(flight => {
                const tr = document.createElement('tr');
                tr.className = 'flight-row';
                tr.innerHTML = `
                    <td>${flight.flight_no}</td>
                    <td>${flight.date_time}</td>
                    <td>${flight.duration_min} min</td>
                    <td>${flight.distance_km} km</td>
                    <td>${flight.source_airport}</td>
                    <td>${flight.destination_airport}</td>
                    <td>${flight.vehicle_type}</td>
                    <td>${flight.partner_flight_no ? 'Yes' : 'No'}</td>
                `;
                
                tr.addEventListener('click', () => {
                    handleFlightSelection(flight);
                });
                
                tbody.appendChild(tr);
            });
        }
        
        function handleFlightSelection(flight) {
            selectedFlight = flight;
            sessionStorage.setItem('selectedFlight', JSON.stringify(flight));
            
            const contextArea = document.getElementById('selected-flight-context');
            if (contextArea) {
                contextArea.textContent = `Selected: ${flight.flight_no} (${flight.source_airport} → ${flight.destination_airport}) on ${flight.date_time}`;
            }
            
            if (openRosterBtn) openRosterBtn.disabled = false;
            
            console.log('Flight selected:', flight);
        }
        
        // Open Roster Button
        if (openRosterBtn) {
            openRosterBtn.addEventListener('click', () => {
                if (selectedFlight) {
                    window.location.href = 'roster-builder.html'; // S3'e git
                }
            });
        }
    }

    // --- S3: ROSTER BUILDER & VALIDATION LOGIC (Screen S3) ---

    let currentRoster = null; 

    function initializeRosterBuilder() {
        console.log('--- Initializing Screen S3 (Roster Builder) ---');
        
        const generateBtn = document.getElementById('generate-roster-btn');
        if (!generateBtn) return; 
        
        // S4'ten kayıtlı roster var mı kontrol et (Save Seat Assignments'ten dönüş)
        const savedRosterString = sessionStorage.getItem('currentRosterDraft');
        if (savedRosterString) {
            currentRoster = JSON.parse(savedRosterString);
            console.log('Loaded saved roster from sessionStorage:', currentRoster);
            normalizeCrewFields(currentRoster);
            renderRosterSummary(currentRoster);
            renderValidationStatus({ rules: currentRoster.rules });
            document.getElementById('edit-crew-btn').disabled = false;
            document.getElementById('seat-assignment-btn').disabled = false;
            document.getElementById('save-export-btn').disabled = false;
            
            const statusDiv = document.getElementById('last-generation-status');
            if (statusDiv) {
                statusDiv.textContent = `Last Draft: ${new Date().toLocaleString()}`;
            }
        }
        
        // Context bilgisini S2'den al
        const selectedFlight = JSON.parse(sessionStorage.getItem('selectedFlight') || '{}');
        if (selectedFlight.flight_no) {
            const contextInfo = document.getElementById('context-info');
            if (contextInfo) {
                contextInfo.textContent = `Flight: ${selectedFlight.flight_no} • Aircraft: ${selectedFlight.vehicle_type} • Date: ${selectedFlight.date_time}`;
            }
        }
        
        // Generate Roster Butonu
        generateBtn.addEventListener('click', async () => {
            await generateRoster();
        });
        
        async function generateRoster() {
            const jwtToken = localStorage.getItem('jwtToken');
            if (!jwtToken) {
                displayError('Session expired. Please login again.');
                return;
            }
            
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            
            try {
                const selectedFlight = JSON.parse(sessionStorage.getItem('selectedFlight') || '{}');
                
                const response = await fetch(ROSTER_GENERATE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({ flight_id: selectedFlight.flight_id })
                });
                
                if (response.ok) {
                    let responseData = await response.json();

                    // Normalize response fields if backend returned real data
                    if (responseData && responseData.passengers && Array.isArray(responseData.passengers)) {
                        responseData.passengers = responseData.passengers.map(p => ({
                            id: p.id || p.passenger_id,
                            name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
                            passengerType: p.passengerType || p.passenger_type || 'ADULT',
                            parentPassengerId: p.parentPassengerId || p.parent_passenger_id || null,
                            ticketClass: p.ticketClass || p.ticket_class || 'Economy',
                            assignedSeat: p.assignedSeat || p.assigned_seat || null
                        }));
                    }

                    // Fallback: if no pilots or passengers, create a minimal mock so UI doesn't break
                    if (!responseData || Object.keys(responseData).length === 0 || !responseData.pilots || responseData.pilots.length === 0) {
                        const selectedFlight = JSON.parse(sessionStorage.getItem('selectedFlight') || '{}');
                        responseData = responseData || {};
                        responseData.flightNumber = responseData.flightNumber || selectedFlight.flight_no || 'N/A';
                        responseData.aircraft = responseData.aircraft || selectedFlight.vehicle_type || 'N/A';
                        responseData.date = responseData.date || selectedFlight.date_time || new Date().toISOString();
                        responseData.pilots = responseData.pilots || [
                            { id: 1, name: 'Captain (Demo)', certType: 'CPT' },
                            { id: 2, name: 'First Officer (Demo)', certType: 'FO' }
                        ];
                        responseData.cabinCrew = responseData.cabinCrew || [];
                        responseData.passengers = responseData.passengers || [];
                        responseData.aircraftCapacity = responseData.aircraftCapacity || 180;
                        responseData.rules = responseData.rules || [];
                    }

                    // Make sure pilots/cabinCrew always have ids and consistent fields
                    normalizeCrewFields(responseData);

                    currentRoster = responseData;
                    
                    // UI'ı güncelle
                    renderRosterSummary(currentRoster);
                    renderValidationStatus({ rules: currentRoster.rules });
                    document.getElementById('edit-crew-btn').disabled = false;
                    document.getElementById('seat-assignment-btn').disabled = false;
                    document.getElementById('save-export-btn').disabled = false;
                    
                    const statusDiv = document.getElementById('last-generation-status');
                    if (statusDiv) {
                        statusDiv.textContent = `Last Draft: ${new Date().toLocaleString()}`;
                    }
                    
                    alert('Roster generated successfully!');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    displayError(errorData.error || 'Failed to generate roster.', response.status);
                }
            } catch (error) {
                displayError(`Network error: ${error.message}`);
            } finally {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Roster (Auto Merge)';
            }
        }
        
        async function validateRoster(roster) {
            const jwtToken = localStorage.getItem('jwtToken');
            
            try {
                const response = await fetch(ROSTER_VALIDATE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify(roster)
                });
                
                if (response.ok) {
                    const validationResult = await response.json();
                    renderValidationStatus(validationResult);
                }
            } catch (error) {
                console.error('Validation check failed:', error);
            }
        }
        
        function renderRosterSummary(roster) {
            const pilotList = document.getElementById('flight-crew-list');
            const cabinList = document.getElementById('cabin-crew-list');
            const passengerList = document.getElementById('passenger-list');
            
            if (pilotList) {
                pilotList.innerHTML = '';
                (roster.pilots || []).forEach(pilot => {
                    const li = document.createElement('li');
                    const idText = (pilot && pilot.id !== undefined && pilot.id !== null) ? `ID: ${pilot.id} — ` : '';
                    li.textContent = `${idText}${pilot.name} (${pilot.certType || 'CPT'})`;
                    pilotList.appendChild(li);
                });
                const pilotCount = document.getElementById('pilot-count');
                if (pilotCount) pilotCount.textContent = roster.pilots?.length || 0;
            }
            
            if (cabinList) {
                cabinList.innerHTML = '';
                (roster.cabinCrew || []).forEach(crew => {
                    const li = document.createElement('li');
                    const idText = (crew && crew.id !== undefined && crew.id !== null) ? `ID: ${crew.id} — ` : '';
                    li.textContent = `${idText}${crew.name} (${crew.type || 'FA'})`;
                    cabinList.appendChild(li);
                });
                const cabinCount = document.getElementById('cabin-count');
                if (cabinCount) cabinCount.textContent = roster.cabinCrew?.length || 0;
            }
            
            if (passengerList) {
                passengerList.innerHTML = '';
                (roster.passengers || []).forEach(passenger => {
                    const li = document.createElement('li');
                    li.textContent = passenger.name;
                    passengerList.appendChild(li);
                });
                const passengerCount = document.getElementById('passenger-count');
                if (passengerCount) passengerCount.textContent = roster.passengers?.length || 0;
            }
        }
        
        function renderValidationStatus(validationResult) {
            const ruleChecklist = document.getElementById('rule-checklist');
            if (!ruleChecklist) return;
            
            ruleChecklist.innerHTML = '';
            
            const rules = validationResult.rules || [];
            rules.forEach(rule => {
                const p = document.createElement('p');
                p.className = rule.passed ? 'status-ok' : 'status-error';
                p.textContent = `${rule.name} (${rule.code})`;
                ruleChecklist.appendChild(p);
            });
        }

        // S4, S5 Buton Aksiyonları
        const seatBtn = document.getElementById('seat-assignment-btn');
        const editBtn = document.getElementById('edit-crew-btn');
        const discardBtn = document.getElementById('discard-draft-btn');
        const saveExportBtn = document.getElementById('save-export-btn');
        
        if (seatBtn) {
            seatBtn.addEventListener('click', () => {
                if (currentRoster) {
                    console.log('📤 Saving roster to sessionStorage for S4:', currentRoster);
                    console.log('   Passengers:', currentRoster.passengers);
                    sessionStorage.setItem('currentRosterDraft', JSON.stringify(currentRoster)); 
                    window.location.href = 'seat-assignment.html'; // S4
                }
            });
        }
        
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                if (currentRoster) {
                    sessionStorage.setItem('currentRosterDraft', JSON.stringify(currentRoster));
                    window.location.href = 'extended-roster.html'; // S5
                }
            });
        }

        if (discardBtn) {
            discardBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to discard this roster draft?')) {
                    currentRoster = null;
                    sessionStorage.removeItem('currentRosterDraft');
                    document.getElementById('roster-summary').innerHTML = '<h3>Roster Summary (Draft)</h3><p>No roster generated yet.</p>';
                    document.getElementById('last-generation-status').textContent = 'Last Draft: None';
                    document.getElementById('edit-crew-btn').disabled = true;
                    document.getElementById('seat-assignment-btn').disabled = true;
                    document.getElementById('save-export-btn').disabled = true;
                }
            });
        }

        if (saveExportBtn) {
            saveExportBtn.addEventListener('click', () => {
                if (currentRoster) {
                    const dataStr = JSON.stringify(currentRoster, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `roster_${currentRoster.flightNumber}_${new Date().getTime()}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            });
        }
    }

    // --- S4: SEAT ASSIGNMENT LOGIC (Screen S4) ---
    
    let currentRosterDraftS4 = null; 

    function initializeSeatAssignment() {
        console.log('--- Initializing Screen S4 (Seat Assignment) ---');
        
        const autoAssignBtn = document.getElementById('auto-assign-btn');
        const saveAssignmentBtn = document.getElementById('save-assignment-btn');
        
        if (!autoAssignBtn) return;
        
        // S3'ten Roster'ı al
        const rosterString = sessionStorage.getItem('currentRosterDraft');
        if (rosterString) {
            currentRosterDraftS4 = JSON.parse(rosterString);
            console.log('📥 Loaded roster from S3:', currentRosterDraftS4);
            console.log('   Total passengers:', currentRosterDraftS4.passengers?.length);
            console.log('   Infant passengers:', currentRosterDraftS4.passengers?.filter(p => p.passengerType === 'INFANT'));

            // Normalize any legacy seat labels (e.g., "A1", "Ç2") into "1A" format.
            // New format: row numbers are lines, English letters are columns.
            (function normalizeAssignedSeatLabels() {
                const seatsPerRow = 6;
                const seatLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, seatsPerRow);

                // Legacy format used Turkish alphabet letters as ROWS and numbers as COLUMNS.
                const legacyRowLetters = ['A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'];

                (currentRosterDraftS4.passengers || []).forEach(p => {
                    if (!p || !p.assignedSeat || typeof p.assignedSeat !== 'string') return;
                    const s = p.assignedSeat.trim();

                    // Already new-style: 12A, 1B, etc.
                    if (/^\d+[A-Z]$/.test(s)) return;

                    // Legacy style: single letter + digits (e.g., A1, Ç2)
                    const m = s.match(/^([A-ZÇĞİÖŞÜİ])\s*(\d+)$/);
                    if (!m) return;

                    const legacyLetter = m[1];
                    const colNumber = Number(m[2]);
                    if (!Number.isFinite(colNumber) || colNumber < 1 || colNumber > seatsPerRow) return;

                    const rowIndex = legacyRowLetters.indexOf(legacyLetter);
                    if (rowIndex < 0) return;

                    const rowNumber = rowIndex + 1;
                    const seatLetter = seatLetters[colNumber - 1];
                    p.assignedSeat = `${rowNumber}${seatLetter}`;
                });
            })();

            renderContextInfo();
            renderSeatGrid();
            renderUnassignedPassengers();
        } else {
            alert('No roster found. Returning to Roster Builder.');
            window.location.href = 'roster-builder.html';
            return;
        }
        
        function renderContextInfo() {
            const contextInfo = document.getElementById('context-info');
            if (contextInfo && currentRosterDraftS4) {
                contextInfo.textContent = `Flight: ${currentRosterDraftS4.flightNumber || 'N/A'} • Aircraft: ${currentRosterDraftS4.aircraft || 'N/A'} • Roster Status: Draft`;
            }
        }
        
        function renderSeatGrid() {
            const seatGrid = document.getElementById('seat-grid');
            if (!seatGrid || !currentRosterDraftS4) return;
            
            const numSeats = currentRosterDraftS4.aircraftCapacity || 100;
            const seatsPerRow = 6;
            const seatLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, seatsPerRow);
            
            seatGrid.innerHTML = '';
            
            for (let i = 0; i < numSeats; i++) {
                const seat = document.createElement('div');
                const rowNumber = Math.floor(i / seatsPerRow) + 1;
                const seatLetter = seatLetters[i % seatsPerRow];
                const seatNumber = `${rowNumber}${seatLetter}`;
                seat.className = 'seat-item unassigned';
                seat.textContent = seatNumber;
                seat.draggable = true;
                seat.dataset.seatNumber = seatNumber;
                
                // Koltuk atanmış mı kontrol et
                const passenger = (currentRosterDraftS4.passengers || []).find(p => p.assignedSeat === seatNumber);
                if (passenger) {
                    seat.className = 'seat-item assigned';
                    const typeLabel = passenger.passengerType || 'ADULT';
                    seat.textContent = `${seatNumber}\n${passenger.name}\n(${typeLabel})`;
                    seat.title = `${passenger.name} - ${typeLabel}`;
                }
                
                seat.addEventListener('dragover', handleDragOver);
                seat.addEventListener('drop', handleSeatDrop);
                seat.addEventListener('dragend', handleDragEnd);
                
                seatGrid.appendChild(seat);
            }
            
            updateCapacityStatus();
        }
        
        function renderUnassignedPassengers() {
            const unassignedList = document.getElementById('unassigned-list');
            if (!unassignedList || !currentRosterDraftS4) return;
            
            unassignedList.innerHTML = '';
            const passengers = currentRosterDraftS4.passengers || [];
            const unassigned = passengers.filter(p => !p.assignedSeat);
            
            // Create map of parent → children/infants for quick lookup
            const childrenByParent = {};
            unassigned.forEach(p => {
                if ((p.passengerType === 'INFANT' || p.passengerType === 'CHILD') && p.parentPassengerId) {
                    if (!childrenByParent[p.parentPassengerId]) {
                        childrenByParent[p.parentPassengerId] = [];
                    }
                    childrenByParent[p.parentPassengerId].push(p);
                }
            });
            
            unassigned.forEach(passenger => {
                const li = document.createElement('li');
                li.className = 'passenger-item';
                
                // Format: "Name (TYPE)" - e.g "John Smith (ADULT)" or "Baby - Smith (INFANT)"
                const typeLabel = passenger.passengerType || passenger.passenger_type || 'ADULT';
                const childrenText = childrenByParent[passenger.id] 
                    ? ` [has ${childrenByParent[passenger.id].map(c => c.name).join(', ')}]` 
                    : '';
                li.textContent = `${passenger.name || 'Unknown'} (${typeLabel})${childrenText}`;
                
                // INFANTs cannot be assigned to seats (they sit with parent)
                // CHILDRENs CAN be assigned their own seats
                if (typeLabel === 'INFANT') {
                    li.style.opacity = '0.6';
                    li.style.cursor = 'not-allowed';
                    li.title = 'Infants travel with their parent - assign parent instead';
                } else {
                    li.draggable = true;
                    li.addEventListener('dragstart', handleDragStart);
                }
                
                li.dataset.passengerId = passenger.id;
                unassignedList.appendChild(li);
            });
            
            const unassignedCount = document.getElementById('unassigned-count');
            if (unassignedCount) {
                unassignedCount.textContent = unassigned.length;
            }
        }
        
        let draggedPassenger = null;
        
        function handleDragStart(e) {
            draggedPassenger = e.target.dataset.passengerId;
            e.target.style.opacity = '0.5';
        }
        
        function handleDragOver(e) {
            e.preventDefault();
            e.target.style.backgroundColor = '#e0e0e0';
        }
        
        function handleSeatDrop(e) {
            e.preventDefault();
            if (draggedPassenger) {
                const seatNumber = e.target.dataset.seatNumber;
                assignPassengerToSeat(draggedPassenger, seatNumber);
            }
        }
        
        function handleDragEnd(e) {
            e.target.style.opacity = '1';
            document.querySelectorAll('.seat-item').forEach(s => s.style.backgroundColor = '');
        }
        
        function assignPassengerToSeat(passengerId, seatNumber) {
            const passenger = (currentRosterDraftS4.passengers || []).find(p => p.id == passengerId);
            if (!passenger) return;
            
            // INFANT passengers cannot be assigned separate seats
            if (passenger.passengerType === 'INFANT') {
                alert('Infant passengers cannot be assigned separate seats - they sit with their parent.');
                return;
            }
            
            // Eğer başka passenger zaten bu koltukta var ise, onun atanmasını kaldır
            const existingPassenger = (currentRosterDraftS4.passengers || []).find(p => p.assignedSeat === seatNumber && p.id != passengerId);
            if (existingPassenger) {
                existingPassenger.assignedSeat = null;
            }
            
            passenger.assignedSeat = seatNumber;
            
            // Update UI
            renderSeatGrid();
            renderUnassignedPassengers();
            updateCapacityStatus();
            saveAssignmentBtn.disabled = false;
        }
        
        function updateCapacityStatus() {
            const capacityStatus = document.getElementById('capacity-status');
            if (capacityStatus) {
                const assigned = (currentRosterDraftS4.passengers || []).filter(p => p.assignedSeat).length;
                const total = currentRosterDraftS4.passengers?.length || 0;
                const capacity = currentRosterDraftS4.aircraftCapacity || 0;
                capacityStatus.textContent = `Seats Filled: ${assigned}/${total} (Capacity: ${capacity})`;
            }
        }
        
        // Auto-Assign Butonu (Rastgele)
        autoAssignBtn.addEventListener('click', async () => {
            autoAssignBtn.disabled = true;
            autoAssignBtn.textContent = 'Auto-assigning...';
            
            try {
                const seatsPerRow = 6;
                const seatLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, seatsPerRow);
                const capacity = currentRosterDraftS4.aircraftCapacity || 100;
                
                // Mevcut tüm koltukları al
                const allSeats = [];
                for (let i = 0; i < capacity; i++) {
                    const rowNumber = Math.floor(i / seatsPerRow) + 1;
                    const seatLetter = seatLetters[i % seatsPerRow];
                    const seatNumber = `${rowNumber}${seatLetter}`;
                    allSeats.push(seatNumber);
                }
                
                // Yolcuları rastgele karıştır
                const passengers = currentRosterDraftS4.passengers || [];
                const shuffledPassengers = [...passengers].sort(() => Math.random() - 0.5);
                
                // Her yolcuya rastgele bir koltuk ata (INFANT hariç)
                let seatIndex = 0;
                shuffledPassengers.forEach((passenger, idx) => {
                    // Skip INFANT passengers - they don't get separate seats
                    if (passenger.passengerType === 'INFANT') {
                        return;
                    }
                    
                    if (!passenger.assignedSeat && seatIndex < allSeats.length) {
                        passenger.assignedSeat = allSeats[seatIndex];
                        seatIndex++;
                    }
                });
                
                // Ekranı güncelle
                renderSeatGrid();
                renderUnassignedPassengers();
                updateCapacityStatus();
                
                alert('Seats auto-assigned randomly!');
                saveAssignmentBtn.disabled = false;
            } catch (error) {
                displayError(`Auto-assign error: ${error.message}`);
            } finally {
                autoAssignBtn.disabled = false;
                autoAssignBtn.textContent = 'Auto-Assign Seats (UC04)';
            }
        });
        
        // Save Assignments Butonu
        if (saveAssignmentBtn) {
            saveAssignmentBtn.addEventListener('click', async () => {
                // Persist seat assignments to backend
                const jwtToken = localStorage.getItem('jwtToken');
                if (!jwtToken) {
                    alert('Session expired. Please login again.');
                    window.location.href = 'index.html';
                    return;
                }

                saveAssignmentBtn.disabled = true;
                saveAssignmentBtn.textContent = 'Saving...';

                try {
                    const response = await fetch(SEAT_ASSIGNMENT_API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${jwtToken}`
                        },
                        body: JSON.stringify(currentRosterDraftS4)
                    });

                    if (response.ok) {
                        const updatedRoster = await response.json();
                        // Save returned roster and redirect
                        sessionStorage.setItem('currentRosterDraft', JSON.stringify(updatedRoster));
                        window.location.href = 'roster-builder.html';
                    } else {
                        const err = await response.json().catch(() => ({}));
                        alert('Failed to save seat assignments: ' + (err.error || err.message || response.status));
                    }
                } catch (error) {
                    alert('Network error while saving assignments: ' + error.message);
                } finally {
                    saveAssignmentBtn.disabled = false;
                    saveAssignmentBtn.textContent = 'Save Seat Assignments';
                }
            });
        }
    }

    // --- S5: ROSTER EDIT & APPROVAL LOGIC (Screen S5) ---

    function initializeRosterEdit() {
        console.log('--- Initializing Screen S5 (Roster Edit & Approval) ---');
        
        const approvalBtn = document.getElementById('approve-roster-btn');
        const addCrewBtn = document.getElementById('add-crew-member-btn');
        
        if (!approvalBtn) return; 
        
        // S3/S4'ten Roster'ı al
        const rosterString = sessionStorage.getItem('currentRosterDraft');
        if (rosterString) {
            currentRosterDraftS5 = JSON.parse(rosterString); // Global variable set
            normalizeCrewFields(currentRosterDraftS5);
            renderContextInfo();
            renderRosterTables();
            renderValidationStatusS5();
            
            // Approval button'u enable et
            approvalBtn.disabled = false;
            
            // Footer button'u da enable et
            const footerApproveBtn = document.getElementById('approve-btn-footer');
            if (footerApproveBtn) {
                footerApproveBtn.disabled = false;
                footerApproveBtn.addEventListener('click', () => {
                    approvalBtn.click(); // Sidebar button'u trigger et
                });
            }
        } else {
            alert('No roster found. Returning to Roster Builder.');
            window.location.href = 'roster-builder.html';
            return;
        }
        
        function renderContextInfo() {
            const contextInfo = document.getElementById('context-info');
            if (contextInfo && currentRosterDraftS5) {
                contextInfo.textContent = `Flight: ${currentRosterDraftS5.flightNumber || 'N/A'} • Aircraft: ${currentRosterDraftS5.aircraft || 'N/A'} • Roster Status: Draft`;
            }
        }
        
        function renderRosterTables() {
            renderPilotTable();
            renderCabinCrewTable();
        }
        
        function renderPilotTable() {
            const pilotTable = document.getElementById('pilot-roster-table');
            const pilotCount = document.getElementById('pilot-count');
            if (!pilotTable) return;
            
            const tbody = pilotTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            const pilots = currentRosterDraftS5.pilots || [];
            pilots.forEach((pilot, index) => {
                const tr = document.createElement('tr');
                const idText = (pilot && pilot.id !== undefined && pilot.id !== null) ? `ID: ${pilot.id} — ` : '';
                tr.innerHTML = `
                    <td>${idText}${pilot.name}</td>
                    <td>${pilot.seniority || 'N/A'}</td>
                    <td>${pilot.certType || 'CPT'}</td>
                    <td>
                        <button onclick="removePilot(${index})" style="color: red;">Remove</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            if (pilotCount) pilotCount.textContent = pilots.length;
        }
        
        function renderCabinCrewTable() {
            const cabinTable = document.getElementById('cabin-roster-table');
            const cabinCount = document.getElementById('cabin-count');
            if (!cabinTable) return;
            
            const tbody = cabinTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            const cabinCrew = currentRosterDraftS5.cabinCrew || [];
            cabinCrew.forEach((crew, index) => {
                const tr = document.createElement('tr');
                const idText = (crew && crew.id !== undefined && crew.id !== null) ? `ID: ${crew.id} — ` : '';
                tr.innerHTML = `
                    <td>${idText}${crew.name}</td>
                    <td>${crew.type || 'FA'}</td>
                    <td>${crew.language || 'EN'}</td>
                    <td>
                        <button onclick="removeCabinCrew(${index})" style="color: red;">Remove</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            if (cabinCount) cabinCount.textContent = cabinCrew.length;
        }
        
        function renderValidationStatusS5() {
            const checklist = document.getElementById('s5-rule-checklist');
            if (!checklist) return;
            
            checklist.innerHTML = `
                <p class="status-ok">DR-01: Pilot composition is compliant.</p>
                <p class="status-warning">DR-03: Cabin crew language mismatch warning.</p>
                <p class="status-ok">DR-02: Vehicle/distance limits within range.</p>
                <p class="status-ok">DR-04: Capacity and seats allocated.</p>
            `;
        }
        
        // Remove Pilot fonksiyonu
        window.removePilot = (index) => {
            if (currentRosterDraftS5.pilots) {
                currentRosterDraftS5.pilots.splice(index, 1);
                renderRosterTables();
            }
        };
        
        // Remove Cabin Crew fonksiyonu
        window.removeCabinCrew = (index) => {
            if (currentRosterDraftS5.cabinCrew) {
                currentRosterDraftS5.cabinCrew.splice(index, 1);
                renderRosterTables();
            }
        };
        
        // Add Crew Member Butonu
        if (addCrewBtn) {
            addCrewBtn.addEventListener('click', () => {
                const crewType = prompt('Enter crew type (pilot/cabin):');
                const name = prompt('Enter crew member name:');
                
                if (crewType && name) {
                    if (crewType.toLowerCase() === 'pilot') {
                        if (!currentRosterDraftS5.pilots) currentRosterDraftS5.pilots = [];
                        currentRosterDraftS5.pilots.push({
                            name,
                            seniority: 'N/A',
                            certType: 'CPT'
                        });
                    } else if (crewType.toLowerCase() === 'cabin') {
                        if (!currentRosterDraftS5.cabinCrew) currentRosterDraftS5.cabinCrew = [];
                        currentRosterDraftS5.cabinCrew.push({
                            name,
                            type: 'FA',
                            language: 'EN'
                        });
                    }
                    normalizeCrewFields(currentRosterDraftS5);
                    renderRosterTables();
                }
            });
        }
        
        

        // Approve Roster Button (UC05, FR-06)
        approvalBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to approve this Roster?')) return;

            const jwtToken = localStorage.getItem('jwtToken');
            if (!jwtToken) {
                alert('Session expired. Please login again.');
                window.location.href = 'index.html';
                return;
            }

            approvalBtn.disabled = true;
            approvalBtn.textContent = 'Approving...';

            try {
                if (!currentRosterDraftS5) throw new Error('No roster to approve');

                const dbTypeSelect = document.getElementById('roster-db-type');
                const dbType = (dbTypeSelect && dbTypeSelect.value) ? dbTypeSelect.value : 'sql';

                // Send dbType to backend so it can store to SQL or NoSQL.
                // Keep backwards compatibility server-side by wrapping roster.
                const approvePayload = { dbType, roster: currentRosterDraftS5 };

                // Call backend to approve roster and persist
                const resp = await fetch(ROSTER_APPROVE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify(approvePayload)
                });

                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || err.message || `Status ${resp.status}`);
                }

                const result = await resp.json();

                // If NoSQL was selected, backend will not return roster_id.
                // In that case, we proceed to S6 using the stored roster payload.
                if (dbType === 'nosql') {
                    const storedRoster = result.roster || { ...currentRosterDraftS5, status: 'APPROVED' };
                    sessionStorage.setItem('finalRosterManifest', JSON.stringify(storedRoster));
                    alert('Roster approved and stored (NoSQL). Redirecting to manifest.');
                    window.location.href = 'final-manifest.html';
                    return;
                }

                // Fetch final manifest from backend using roster_id
                if (result && result.roster_id) {
                    const manifestResp = await fetch(`${FINAL_MANIFEST_API_URL}/${result.roster_id}`, {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${jwtToken}` }
                    });

                    if (!manifestResp.ok) {
                        const err = await manifestResp.json().catch(() => ({}));
                        throw new Error(err.error || err.message || `Status ${manifestResp.status}`);
                    }

                    const manifest = await manifestResp.json();
                    // Save manifest for final-manifest screen and navigate
                    sessionStorage.setItem('finalRosterManifest', JSON.stringify(manifest));
                    alert('Roster approved and saved. Redirecting to manifest.');
                    window.location.href = 'final-manifest.html';
                } else {
                    throw new Error('No roster_id returned from approval');
                }
            } catch (error) {
                alert('Failed to approve roster: ' + error.message);
            } finally {
                approvalBtn.disabled = false;
                approvalBtn.textContent = 'APPROVE ROSTER DRAFT';
            }
        });
    }

    // --- S6: FINAL MANIFEST LOGIC (Screen S6) ---

    function initializeFinalManifest() {
        console.log('--- Initializing Screen S6 (Final Manifest) ---');
        
        const finalRosterString = sessionStorage.getItem('finalRosterManifest');
        if (!finalRosterString) {
            alert('No final roster found. Returning to Roster Builder.');
            window.location.href = 'roster-builder.html';
            return;
        }

        const finalRoster = JSON.parse(finalRosterString);
        
        // Manifest'i render et (backend manifest data)
        renderFinalManifest(finalRoster);
        
        // Backend endpoint henüz uygulanmadı - sessionStorage'dan gelen veri kullanılıyor
        // fetchManifestDetails(finalRoster);
        
        function renderFinalManifest(roster) {
            const contextInfo = document.getElementById('context-info');
            if (contextInfo) {
                const flightNo = roster.flight_no || roster.flightNumber || 'N/A';
                const aircraft = roster.aircraft_type || roster.aircraft || 'N/A';
                contextInfo.textContent = `Flight: ${flightNo} • Aircraft: ${aircraft} • Roster Status: ${roster.status || 'APPROVED'}`;
            }
            
            // Flight Details - handle both backend manifest format and roster format
            document.getElementById('s6-flight-no').textContent = roster.flight_no || roster.flightNumber || 'N/A';
            document.getElementById('s6-date-time').textContent = roster.date_time || roster.departureTime || roster.date || 'N/A';
            document.getElementById('s6-aircraft').textContent = roster.aircraft_type || roster.aircraft || 'N/A';
            document.getElementById('s6-pax-count').textContent = (roster.passengers || []).length;
            
            // Pilot Manifest - handle both crews array and pilots array
            const pilotList = document.getElementById('pilot-manifest-list');
            if (pilotList) {
                pilotList.innerHTML = '';
                const pilots = roster.pilots || (roster.crews || []).filter(c => c.position === 'Pilot');
                pilots.forEach(pilot => {
                    const li = document.createElement('li');
                    const crewId = (pilot && (pilot.id ?? pilot.crew_id ?? pilot.employee_id ?? pilot.user_id)) ?? null;
                    const idText = crewId !== null && crewId !== undefined ? `ID: ${crewId} — ` : '';
                    li.innerHTML = `<strong>${idText}${pilot.name}</strong> - ${pilot.certType || pilot.position || 'Pilot'}`;
                    pilotList.appendChild(li);
                });
            }
            
            // Cabin Crew Manifest - handle both crews array and cabinCrew array
            const cabinList = document.getElementById('cabin-manifest-list');
            if (cabinList) {
                cabinList.innerHTML = '';
                const cabinCrew = roster.cabinCrew || (roster.crews || []).filter(c => c.position === 'Cabin Crew');
                cabinCrew.forEach(crew => {
                    const li = document.createElement('li');
                    const crewId = (crew && (crew.id ?? crew.crew_id ?? crew.employee_id ?? crew.user_id)) ?? null;
                    const idText = crewId !== null && crewId !== undefined ? `ID: ${crewId} — ` : '';
                    li.innerHTML = `<strong>${idText}${crew.name}</strong> - ${crew.type || crew.position || 'Flight Attendant'}`;
                    cabinList.appendChild(li);
                });
            }
            
            // Passenger Manifest Table
            const paxTable = document.getElementById('pax-manifest-table');
            if (paxTable) {
                const tbody = paxTable.querySelector('tbody');
                tbody.innerHTML = '';
                
                (roster.passengers || []).forEach((passenger, index) => {
                    const tr = document.createElement('tr');
                    // Handle both backend format (passenger_type) and frontend format (passengerType)
                    const typeLabel = passenger.passenger_type || passenger.passengerType || 'ADULT';
                    const passengerId = passenger.passenger_id || passenger.id;
                    const parentId = passenger.parent_passenger_id || passenger.parentPassengerId;
                    const seatNo = passenger.assigned_seat || passenger.assignedSeat;
                    
                    // Infant yolcuların koltuk bilgisini ebeveyninkinden al; Child yolcuların kendi koltuğu var
                    let seatDisplay = seatNo || 'TBD';
                    if (typeLabel === 'INFANT' && parentId) {
                        const parent = (roster.passengers || []).find(p => 
                            (p.passenger_id || p.id) == parentId
                        );
                        if (parent) {
                            const parentSeat = parent.assigned_seat || parent.assignedSeat;
                            // Only show "with parent" if parent actually has a seat assigned
                            if (parentSeat) {
                                seatDisplay = `${parentSeat} (shared with parent)`;
                            } else {
                                // Parent has no seat yet - show TBD and indicate they need parent assignment
                                seatDisplay = 'TBD (parent unassigned)';
                            }
                        } else {
                            // Parent not found on this flight
                            seatDisplay = 'TBD (parent not found)';
                        }
                    }
                    
                    tr.innerHTML = `
                        <td>${seatDisplay}</td>
                        <td>${passenger.name}</td>
                        <td>${typeLabel}</td>
                        <td>${passenger.ticket_class || passenger.ticketClass || 'Economy'}</td>
                        <td>${passengerId || ('PAX-' + (index + 1))}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
        
        async function fetchManifestDetails(roster) {
            const jwtToken = localStorage.getItem('jwtToken');
            if (!jwtToken) return;
            
            try {
                const response = await fetch(FINAL_MANIFEST_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({ rosterId: roster.id || roster.flightNumber })
                });
                
                if (response.ok) {
                    const manifest = await response.json();
                    console.log('Manifest fetched from server:', manifest);
                    // Eğer backend daha detaylı manifest döndürürse, bunu renderle
                }
            } catch (error) {
                console.error('Failed to fetch manifest details:', error);
            }
        }
        
        // Print Button
        const printBtn = document.getElementById('print-manifest-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
        
        // Download Button (CSV)
        const downloadBtn = document.getElementById('download-manifest-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                downloadManifestAsCSV(finalRoster);
            });
        }

        // Logout Button -> S1
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('userRole');
                sessionStorage.clear();
                window.location.href = 'index.html';
            });
        }
        
        function downloadManifestAsCSV(roster) {
            let csv = 'Seat No,Name,Passenger Type,Ticket Class,PAX ID\n';
            
            (roster.passengers || []).forEach((passenger, index) => {
                const typeLabel = passenger.passengerType || 'ADULT';
                
                // Infant yolcuların koltuk bilgisini ebeveyninkinden al
                let seatDisplay = passenger.assignedSeat || 'TBD';
                if (passenger.passengerType === 'INFANT' && passenger.parentPassengerId) {
                    const parent = (roster.passengers || []).find(p => p.id === passenger.parentPassengerId);
                    if (parent && parent.assignedSeat) {
                        seatDisplay = `${parent.assignedSeat} (with parent)`;
                    }
                }
                
                csv += `"${seatDisplay}","${passenger.name}","${typeLabel}","${passenger.ticketClass || 'Economy'}","${passenger.id || ('PAX-' + (index + 1))}"\n`;
            });
            
            const dataBlob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `manifest-${finalRoster.flightNumber || 'export'}.csv`;
            link.click();
        }
    }

    // --- Sayfa Yükleme Kontrolü (index.js'in en alt kısmı) ---

    // Her sayfa yüklendiğinde doğru init fonksiyonunu çağır
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage === 'flight-search.html') {
        applyRoleRestrictions(); 
        initializeFlightSearch();
    } else if (currentPage === 'roster-builder.html') {
        applyRoleRestrictions(); 
        initializeRosterBuilder();
    } else if (currentPage === 'seat-assignment.html') {
        applyRoleRestrictions(); 
        initializeSeatAssignment();
    } else if (currentPage === 'extended-roster.html') {
        applyRoleRestrictions(); 
        initializeRosterEdit();
    } else if (currentPage === 'final-manifest.html') {
        applyRoleRestrictions(); 
        initializeFinalManifest();
    } else {
        // index.html (login page)
        applyRoleRestrictions(); 
        initializeLogin();
    }
});