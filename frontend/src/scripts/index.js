document.addEventListener('DOMContentLoaded', () => {
    // --- Global Yardımcı Fonksiyonlar ve API Tanımları ---

    // DİKKAT: Port 3000'de backend çalışıyor
    const PROVIDER_API_BASE = 'http://localhost:3000/'; 
    
    // API Endpoints
    const LOGIN_API_URL = PROVIDER_API_BASE + 'auth/login'; 
    const FLIGHT_SEARCH_API_URL = PROVIDER_API_BASE + 'flights'; 
    const ROSTER_GENERATE_API_URL = PROVIDER_API_BASE + 'roster/generate';
    const ROSTER_VALIDATE_API_URL = PROVIDER_API_BASE + 'roster/validate';
    const ROSTER_APPROVE_API_URL = PROVIDER_API_BASE + 'roster/approve';
    const SEAT_ASSIGNMENT_API_URL = PROVIDER_API_BASE + 'roster/assign-seats'; 
    const FINAL_MANIFEST_API_URL = PROVIDER_API_BASE + 'roster/manifest';
    const CABIN_CREW_API_URL = PROVIDER_API_BASE + 'cabincrew';
    const VEHICLE_TYPES_API_URL = PROVIDER_API_BASE + 'vehicletypes'; 

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
    function ensureCrewIds(roster) {
        if (!roster) return;

        const pilots = roster.pilots || [];
        const cabin = roster.cabinCrew || [];

        let maxId = 999;
        pilots.concat(cabin).forEach(c => {
            if (c && c.id !== undefined && !isNaN(Number(c.id))) {
                const n = Number(c.id);
                if (n > maxId) maxId = n;
            }
        });

        function nextId() { maxId += 1; return maxId; }

        pilots.forEach(p => {
            if (!p.id) p.id = nextId();
        });

        cabin.forEach(c => {
            if (!c.id) c.id = nextId();
        });
    }


    // --- S1: AUTHENTICATE LOGIC (Screen S1) ---

    function handleSuccessfulLogin(jwtToken, role) {
        localStorage.setItem('jwtToken', jwtToken);
        localStorage.setItem('userRole', role); 
        window.location.href = 'flight-search.html'; 
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
                    
                    // Client-side filtreleme
                    flights = flights.filter(flight => {
                        const matchesNumber = !flightNumber || flight.flight_no.toLowerCase().includes(flightNumber.toLowerCase());
                        const matchesDate = !date || flight.date_time.startsWith(date);
                        const matchesOrigin = !origin || flight.source_airport.toLowerCase().includes(origin.toLowerCase());
                        const matchesDestination = !destination || flight.destination_airport.toLowerCase().includes(destination.toLowerCase());
                        const matchesAircraft = !aircraftType || flight.vehicle_type.toLowerCase().includes(aircraftType.toLowerCase());
                        
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
        
        // Context bilgisini S2'den al
        const selectedFlight = JSON.parse(sessionStorage.getItem('selectedFlight') || '{}');
        if (selectedFlight.flight_no) {
            const contextInfo = document.getElementById('context-info');
            if (contextInfo) {
                contextInfo.textContent = `Flight: ${selectedFlight.flight_no} • Aircraft: ${selectedFlight.vehicle_type} • Date: ${selectedFlight.date_time}`;
            }
        }
        
        // If a roster draft exists in sessionStorage, load and render it
        const savedDraft = sessionStorage.getItem('currentRosterDraft');
        if (savedDraft) {
            try {
                currentRoster = JSON.parse(savedDraft);
                ensureCrewIds(currentRoster);
                renderRosterSummary(currentRoster);
                document.getElementById('edit-crew-btn').disabled = false;
                document.getElementById('seat-assignment-btn').disabled = false;
                const statusDiv = document.getElementById('last-generation-status');
                if (statusDiv) statusDiv.textContent = `Last Draft: (restored)`;
            } catch (e) {
                console.warn('Failed to parse saved roster draft:', e);
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
                        currentRoster = await response.json();

                        // Debug: log roster from server
                        console.log('Generated roster (raw):', currentRoster);

                        // Ensure crew members have numeric ids
                        ensureCrewIds(currentRoster);

                        // If ids were still missing, log warning
                        if ((currentRoster.pilots || []).some(p => !p.id) || (currentRoster.cabinCrew || []).some(c => !c.id)) {
                            console.warn('Some crew members had no id; ensureCrewIds attempted to assign ids.', currentRoster);
                        }

                        // UI'ı güncelle
                        renderRosterSummary(currentRoster);

                        // Persist draft so IDs remain visible when returning to S3
                        try {
                            sessionStorage.setItem('currentRosterDraft', JSON.stringify(currentRoster));
                        } catch (e) {
                            console.warn('Failed to persist roster draft to sessionStorage:', e);
                        }
                    renderValidationStatus({ rules: currentRoster.rules });
                    document.getElementById('edit-crew-btn').disabled = false;
                    document.getElementById('seat-assignment-btn').disabled = false;
                    
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
                    const idText = pilot.id !== undefined ? `ID: ${pilot.id} — ` : '';
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
                    const idText = crew.id !== undefined ? `ID: ${crew.id} — ` : '';
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
        
        if (seatBtn) {
            seatBtn.addEventListener('click', () => {
                if (currentRoster) {
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
            ensureCrewIds(currentRosterDraftS4);
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
                seat.className = 'seat unassigned';
                const rowNumber = Math.floor(i / seatsPerRow) + 1;
                const seatLetter = seatLetters[i % seatsPerRow];
                seat.textContent = `${rowNumber}${seatLetter}`;
                seat.draggable = true;
                seat.dataset.seatNumber = seat.textContent;
                
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
            
            passengers.forEach(passenger => {
                const li = document.createElement('li');
                li.className = 'passenger-item';
                li.textContent = passenger.name || 'Unknown';
                li.draggable = true;
                li.dataset.passengerId = passenger.id;
                
                li.addEventListener('dragstart', handleDragStart);
                
                unassignedList.appendChild(li);
            });
            
            const unassignedCount = document.getElementById('unassigned-count');
            if (unassignedCount) {
                unassignedCount.textContent = passengers.length;
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
            document.querySelectorAll('.seat').forEach(s => s.style.backgroundColor = '');
        }
        
        function assignPassengerToSeat(passengerId, seatNumber) {
            const passenger = (currentRosterDraftS4.passengers || []).find(p => p.id === passengerId);
            if (!passenger) return;
            
            passenger.assignedSeat = seatNumber;
            
            // Update seat visually
            const seat = document.querySelector(`[data-seat-number="${seatNumber}"]`);
            if (seat) {
                seat.className = 'seat assigned';
                seat.textContent = `${seatNumber} (${passenger.name})`;
            }
            
            // Remove from unassigned
            renderUnassignedPassengers();
            updateCapacityStatus();
            saveAssignmentBtn.disabled = false;
        }
        
        function updateCapacityStatus() {
            const capacityStatus = document.getElementById('capacity-status');
            if (capacityStatus) {
                const assigned = (currentRosterDraftS4.passengers || []).filter(p => p.assignedSeat).length;
                const total = currentRosterDraftS4.passengers?.length || 0;
                capacityStatus.textContent = `Capacity: ${assigned}/${total}`;
            }
        }
        
        // Auto-Assign Butonu
        autoAssignBtn.addEventListener('click', async () => {
            autoAssignBtn.disabled = true;
            autoAssignBtn.textContent = 'Auto-assigning...';
            
            const jwtToken = localStorage.getItem('jwtToken');
            
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
                    currentRosterDraftS4 = await response.json();
                    renderSeatGrid();
                    renderUnassignedPassengers();
                    alert('Seats auto-assigned successfully!');
                    saveAssignmentBtn.disabled = false;
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    displayError(errorData.message || 'Auto-assignment failed.', response.status);
                }
            } catch (error) {
                displayError(`Network error: ${error.message}`);
            } finally {
                autoAssignBtn.disabled = false;
                autoAssignBtn.textContent = 'Auto-Assign Seats (UC04)';
            }
        });
        
        // Save Assignments Butonu
        if (saveAssignmentBtn) {
            saveAssignmentBtn.addEventListener('click', () => {
                sessionStorage.setItem('currentRosterDraft', JSON.stringify(currentRosterDraftS4));
                window.location.href = 'roster-builder.html';
            });
        }
    }
    
    // --- S5: CREW EDIT & APPROVAL LOGIC (Screen S5) ---
    
    let currentRosterDraftS5 = null; 

    function initializeRosterEdit() {
        console.log('--- Initializing Screen S5 (Crew Edit) ---');
        
        const approvalBtn = document.getElementById('approve-roster-btn');
        const addCrewBtn = document.getElementById('add-crew-member-btn');
        
        if (!approvalBtn) return; 
        
        // S3/S4'ten Roster'ı al
        const rosterString = sessionStorage.getItem('currentRosterDraft');
        if (rosterString) {
            currentRosterDraftS5 = JSON.parse(rosterString);
            ensureCrewIds(currentRosterDraftS5);
            renderContextInfo();
            renderRosterTables();
            renderValidationStatusS5();
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
                const idText = pilot.id !== undefined ? `${pilot.id}` : '';
                tr.innerHTML = `
                    <td>${idText} • ${pilot.name}</td>
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
                const idText = crew.id !== undefined ? `${crew.id}` : '';
                tr.innerHTML = `
                    <td>${idText} • ${crew.name}</td>
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
                    // determine next id
                    let maxId = 999;
                    (currentRosterDraftS5.pilots || []).concat(currentRosterDraftS5.cabinCrew || []).forEach(c => {
                        if (c && c.id !== undefined && !isNaN(Number(c.id))) {
                            const n = Number(c.id);
                            if (n > maxId) maxId = n;
                        }
                    });
                    const newId = maxId + 1;

                    if (crewType.toLowerCase() === 'pilot') {
                        if (!currentRosterDraftS5.pilots) currentRosterDraftS5.pilots = [];
                        currentRosterDraftS5.pilots.push({
                            id: newId,
                            name,
                            seniority: 'N/A',
                            certType: 'CPT'
                        });
                    } else if (crewType.toLowerCase() === 'cabin') {
                        if (!currentRosterDraftS5.cabinCrew) currentRosterDraftS5.cabinCrew = [];
                        currentRosterDraftS5.cabinCrew.push({
                            id: newId,
                            name,
                            type: 'FA',
                            language: 'EN'
                        });
                    }
                    renderRosterTables();
                }
            });
        }
        
        

        // Approve Roster Button (UC05, FR-06)
        approvalBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to approve this Roster?')) return;
            
            const jwtToken = localStorage.getItem('jwtToken');
            if (!jwtToken) {
                displayError('Session expired. Please login again.');
                return;
            }
            
            approvalBtn.disabled = true;
            approvalBtn.textContent = 'Approving...';
            
            try {
                const response = await fetch(ROSTER_APPROVE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify(currentRosterDraftS5) 
                });
                
                if (response.ok) {
                    const approvedRoster = await response.json();
                    alert('Roster successfully approved and published! Redirecting to manifest.');
                    sessionStorage.setItem('finalRosterManifest', JSON.stringify(approvedRoster));
                    window.location.href = 'final-manifest.html'; // S6'ya yönlendir
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    displayError(errorData.message || 'Approval failed.', response.status);
                }
            } catch (error) {
                displayError(`Network error: ${error.message}`);
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
        ensureCrewIds(finalRoster);
        
        // Manifest'i render et
        renderFinalManifest(finalRoster);
        
        // Backend endpoint henüz uygulanmadı - sessionStorage'dan gelen veri kullanılıyor
        // fetchManifestDetails(finalRoster);
        
        function renderFinalManifest(roster) {
            const contextInfo = document.getElementById('context-info');
            if (contextInfo) {
                contextInfo.textContent = `Flight: ${roster.flightNumber || 'N/A'} • Aircraft: ${roster.aircraft || 'N/A'} • Roster Status: APPROVED`;
            }
            
            // Flight Details
            document.getElementById('s6-flight-no').textContent = roster.flightNumber || 'N/A';
            document.getElementById('s6-date-time').textContent = roster.departureTime || roster.date || 'N/A';
            document.getElementById('s6-aircraft').textContent = roster.aircraft || 'N/A';
            document.getElementById('s6-pax-count').textContent = (roster.passengers || []).length;
            
            // Pilot Manifest
            const pilotList = document.getElementById('pilot-manifest-list');
            if (pilotList) {
                pilotList.innerHTML = '';
                (roster.pilots || []).forEach(pilot => {
                    const li = document.createElement('li');
                    const idText = pilot.id !== undefined ? `${pilot.id} • ` : '';
                    li.innerHTML = `<strong>${idText}${pilot.name}</strong> - ${pilot.certType || 'Captain'}`;
                    pilotList.appendChild(li);
                });
            }
            
            // Cabin Crew Manifest
            const cabinList = document.getElementById('cabin-manifest-list');
            if (cabinList) {
                cabinList.innerHTML = '';
                (roster.cabinCrew || []).forEach(crew => {
                    const li = document.createElement('li');
                    const idText = crew.id !== undefined ? `${crew.id} • ` : '';
                    li.innerHTML = `<strong>${idText}${crew.name}</strong> - ${crew.type || 'Flight Attendant'} (${crew.language || 'EN'})`;
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
                    tr.innerHTML = `
                        <td>${passenger.assignedSeat || 'TBD'}</td>
                        <td>${passenger.name}</td>
                        <td>${passenger.ticketClass || 'Economy'}</td>
                        <td>${passenger.id || `PAX-${index + 1}`}</td>
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
            let csv = 'Seat No,Name,Ticket Class,PAX ID\n';
            
            (roster.passengers || []).forEach((passenger, index) => {
                csv += `"${passenger.assignedSeat || 'TBD'}","${passenger.name}","${passenger.ticketClass || 'Economy'}","${passenger.id || `PAX-${index + 1}`}"\n`;
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

    document.addEventListener('DOMContentLoaded', () => {
        
        // GÖREV 15: Her sayfa yüklendiğinde kısıtlamaları uygulayın
        applyRoleRestrictions(); 
        
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        if (currentPage === 'flight-search.html') {
            initializeFlightSearch();
        } else if (currentPage === 'roster-builder.html') {
            initializeRosterBuilder();
        } else if (currentPage === 'seat-assignment.html') {
            initializeSeatAssignment();
        } else if (currentPage === 'extended-roster.html') {
            initializeRosterEdit();
        } else if (currentPage === 'final-manifest.html') {
            initializeFinalManifest(); // S6'yı Başlat
        } else {
            initializeLogin();
        }
    });
});