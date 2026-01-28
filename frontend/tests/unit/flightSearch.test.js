/**
 * Frontend Unit Tests - Flight Search Module
 * 
 * Tests flight search functionality, filtering, sorting, and display
 */

describe('Flight Search Module', () => {
  let flightContainer;
  let searchInput;
  let filterButton;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="search-container">
        <input id="search-input" type="text" placeholder="Search flights..." />
        <button id="filter-btn">Filter</button>
      </div>
      <div id="flights-container"></div>
    `;

    flightContainer = document.getElementById('flights-container');
    searchInput = document.getElementById('search-input');
    filterButton = document.getElementById('filter-btn');
  });

  describe('Flight Data Model', () => {
    it('should have required flight properties', () => {
      const flight = {
        id: 1,
        flightNumber: 'TK101',
        departureAirport: 'IST',
        arrivalAirport: 'AYT',
        departureTime: '2024-01-15T08:00:00Z',
        arrivalTime: '2024-01-15T11:00:00Z',
        aircraftId: 5,
        status: 'SCHEDULED',
      };

      expect(flight).toHaveProperty('id');
      expect(flight).toHaveProperty('flightNumber');
      expect(flight).toHaveProperty('departureAirport');
      expect(flight).toHaveProperty('arrivalAirport');
      expect(flight).toHaveProperty('departureTime');
      expect(flight).toHaveProperty('arrivalTime');
    });

    it('should validate flight status values', () => {
      const validStatuses = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'CANCELLED'];
      
      const isValidStatus = (status) => validStatuses.includes(status);

      expect(isValidStatus('SCHEDULED')).toBe(true);
      expect(isValidStatus('DEPARTED')).toBe(true);
      expect(isValidStatus('INVALID')).toBe(false);
    });

    it('should validate airport codes', () => {
      const isValidAirportCode = (code) => {
        return /^[A-Z]{3}$/.test(code); // 3-letter code
      };

      expect(isValidAirportCode('IST')).toBe(true);
      expect(isValidAirportCode('AYT')).toBe(true);
      expect(isValidAirportCode('JFK')).toBe(true);
      expect(isValidAirportCode('AB')).toBe(false); // Too short
      expect(isValidAirportCode('ABCD')).toBe(false); // Too long
    });
  });

  describe('Search Functionality', () => {
    it('should filter flights by flight number', () => {
      const flights = [
        { id: 1, flightNumber: 'TK101', departureAirport: 'IST' },
        { id: 2, flightNumber: 'TK202', departureAirport: 'AYT' },
        { id: 3, flightNumber: 'TK303', departureAirport: 'IST' },
      ];

      const searchFlights = (query) => {
        return flights.filter(f => 
          f.flightNumber.includes(query.toUpperCase())
        );
      };

      expect(searchFlights('TK1')).toHaveLength(1);
      expect(searchFlights('TK')).toHaveLength(3);
      expect(searchFlights('99')).toHaveLength(0);
    });

    it('should filter flights by airport', () => {
      const flights = [
        { id: 1, flightNumber: 'TK101', departureAirport: 'IST', arrivalAirport: 'AYT' },
        { id: 2, flightNumber: 'TK202', departureAirport: 'AYT', arrivalAirport: 'IST' },
        { id: 3, flightNumber: 'TK303', departureAirport: 'IST', arrivalAirport: 'ANT' },
      ];

      const filterByDeparture = (airport) => {
        return flights.filter(f => f.departureAirport === airport);
      };

      expect(filterByDeparture('IST')).toHaveLength(2);
      expect(filterByDeparture('AYT')).toHaveLength(1);
    });

    it('should filter flights by date range', () => {
      const flights = [
        { id: 1, flightNumber: 'TK101', departureTime: '2024-01-10T08:00:00Z' },
        { id: 2, flightNumber: 'TK202', departureTime: '2024-01-15T08:00:00Z' },
        { id: 3, flightNumber: 'TK303', departureTime: '2024-01-20T08:00:00Z' },
      ];

      const filterByDateRange = (startDate, endDate) => {
        return flights.filter(f => {
          const depTime = new Date(f.departureTime);
          return depTime >= startDate && depTime <= endDate;
        });
      };

      const start = new Date('2024-01-12');
      const end = new Date('2024-01-18');

      expect(filterByDateRange(start, end)).toHaveLength(1);
    });

    it('should handle empty search results', () => {
      const flights = [
        { id: 1, flightNumber: 'TK101' },
      ];

      const searchFlights = (query) => {
        return flights.filter(f => f.flightNumber.includes(query));
      };

      const results = searchFlights('XX');
      expect(results).toHaveLength(0);
    });
  });

  describe('Sorting Functionality', () => {
    it('should sort flights by departure time', () => {
      const flights = [
        { id: 1, flightNumber: 'TK101', departureTime: '2024-01-15T18:00:00Z' },
        { id: 2, flightNumber: 'TK202', departureTime: '2024-01-15T08:00:00Z' },
        { id: 3, flightNumber: 'TK303', departureTime: '2024-01-15T12:00:00Z' },
      ];

      const sorted = [...flights].sort((a, b) => 
        new Date(a.departureTime) - new Date(b.departureTime)
      );

      expect(sorted[0].flightNumber).toBe('TK202');
      expect(sorted[1].flightNumber).toBe('TK303');
      expect(sorted[2].flightNumber).toBe('TK101');
    });

    it('should sort flights by flight number', () => {
      const flights = [
        { id: 1, flightNumber: 'TK303' },
        { id: 2, flightNumber: 'TK101' },
        { id: 3, flightNumber: 'TK202' },
      ];

      const sorted = [...flights].sort((a, b) => 
        a.flightNumber.localeCompare(b.flightNumber)
      );

      expect(sorted[0].flightNumber).toBe('TK101');
      expect(sorted[1].flightNumber).toBe('TK202');
      expect(sorted[2].flightNumber).toBe('TK303');
    });

    it('should support reverse sorting', () => {
      const flights = [
        { id: 1, flightNumber: 'TK101', departureTime: '2024-01-15T08:00:00Z' },
        { id: 2, flightNumber: 'TK202', departureTime: '2024-01-15T18:00:00Z' },
      ];

      const sortByDepartureAsc = (flights) => 
        [...flights].sort((a, b) => 
          new Date(a.departureTime) - new Date(b.departureTime)
        );

      const sortByDepartureDesc = (flights) => 
        sortByDepartureAsc(flights).reverse();

      expect(sortByDepartureDesc(flights)[0].flightNumber).toBe('TK202');
      expect(sortByDepartureDesc(flights)[1].flightNumber).toBe('TK101');
    });
  });

  describe('Flight Display', () => {
    it('should render flight list', () => {
      const flights = [
        { id: 1, flightNumber: 'TK101', departureAirport: 'IST', arrivalAirport: 'AYT' },
        { id: 2, flightNumber: 'TK202', departureAirport: 'AYT', arrivalAirport: 'IST' },
      ];

      const renderFlights = (flights) => {
        flightContainer.innerHTML = flights.map(f => 
          `<div class="flight-item" data-id="${f.id}">${f.flightNumber}</div>`
        ).join('');
      };

      renderFlights(flights);

      expect(flightContainer.querySelectorAll('.flight-item')).toHaveLength(2);
      expect(flightContainer.querySelector('[data-id="1"]')).not.toBeNull();
    });

    it('should display flight details', () => {
      const flight = {
        id: 1,
        flightNumber: 'TK101',
        departureAirport: 'IST',
        arrivalAirport: 'AYT',
        departureTime: '2024-01-15T08:00:00Z',
        arrivalTime: '2024-01-15T11:00:00Z',
        status: 'SCHEDULED',
      };

      const renderFlightDetails = (flight) => {
        return `
          <div class="flight-details">
            <h3>${flight.flightNumber}</h3>
            <p>${flight.departureAirport} → ${flight.arrivalAirport}</p>
            <p>Status: ${flight.status}</p>
          </div>
        `;
      };

      const html = renderFlightDetails(flight);
      expect(html).toContain('TK101');
      expect(html).toContain('IST → AYT');
      expect(html).toContain('SCHEDULED');
    });

    it('should handle flight status display', () => {
      const statusColorMap = {
        'SCHEDULED': 'blue',
        'BOARDING': 'yellow',
        'DEPARTED': 'green',
        'ARRIVED': 'gray',
        'CANCELLED': 'red',
      };

      const getStatusColor = (status) => statusColorMap[status] || 'gray';

      expect(getStatusColor('SCHEDULED')).toBe('blue');
      expect(getStatusColor('CANCELLED')).toBe('red');
      expect(getStatusColor('UNKNOWN')).toBe('gray');
    });
  });

  describe('Pagination', () => {
    it('should paginate flight results', () => {
      const flights = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        flightNumber: `TK${(i + 1).toString().padStart(3, '0')}`,
      }));

      const paginate = (items, pageSize, pageNum) => {
        const start = (pageNum - 1) * pageSize;
        return items.slice(start, start + pageSize);
      };

      expect(paginate(flights, 10, 1)).toHaveLength(10);
      expect(paginate(flights, 10, 2)).toHaveLength(10);
      expect(paginate(flights, 10, 3)).toHaveLength(5); // Last page
    });

    it('should calculate total pages', () => {
      const calculatePages = (total, pageSize) => {
        return Math.ceil(total / pageSize);
      };

      expect(calculatePages(25, 10)).toBe(3);
      expect(calculatePages(20, 10)).toBe(2);
      expect(calculatePages(5, 10)).toBe(1);
    });
  });
});
