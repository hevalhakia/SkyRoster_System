const { describe, test, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const rosterGenerationService = require('../../src/services/rosterGenerationService');
const fs = require('fs');
const path = require('path');/**
function generateMockPassengers(count) {
  const passengers = [];
  const prefixes = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
  const firstNames = ['John', 'Jane', 'Robert', 'Mary', 'James', 'Patricia', 'Michael', 'Linda', 'David', 'Barbara'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  for (let i = 1; i <= count; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const passenger = {
      id: `PASS-${String(i).padStart(6, '0')}`,
      name: `${prefix} ${firstName} ${lastName}`,
      email: `passenger.${i}@airline.com`,
      passport: `PASS${String(i).padStart(8, '0')}`,
      nationality: 'USA',
      dateOfBirth: `1980-01-${String((i % 28) + 1).padStart(2, '0')}`,
      phone: `+1${String(i).padStart(10, '0')}`,
      bookingReference: `BK${String(i).padStart(8, '0')}`,
      ticketNumber: `TK${String(i).padStart(10, '0')}`,
      seatClass: i % 5 === 0 ? 'business' : i % 10 === 0 ? 'first' : 'economy',
      specialRequirements: i % 50 === 0 ? 'wheelchair' : i % 100 === 0 ? 'infant' : null,
      isInfant: i % 100 === 0,
      isWheelchair: i % 50 === 0,
      mealPreference: ['vegetarian', 'vegan', 'muslim', 'jewish', 'regular'][Math.floor(Math.random() * 5)],
    };
    passengers.push(passenger);
  }
  return passengers;
}
function generateMockCrew(count) {
  const crew = [];
  const roles = ['captain', 'first_officer', 'chief_flight_attendant', 'flight_attendant'];
  const firstNames = ['John', 'Jane', 'Robert', 'Mary', 'James', 'Patricia', 'Michael', 'Linda'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const crewMember = {
      id: `CREW-${String(i + 1).padStart(4, '0')}`,
      name: `${firstName} ${lastName}`,
      role: roles[i % roles.length],
      employeeId: `EMP${String(i + 1).padStart(8, '0')}`,
      yearsOfExperience: Math.floor(Math.random() * 20) + 1,
      flightHours: Math.floor(Math.random() * 15000) + 1000,
    };
    crew.push(crewMember);
  }
  return crew;
}
function generateMockFlight(flightNumber = 'TK001') {
  return {
    id: `FLIGHT-${flightNumber}`,
    flightNumber: flightNumber,
    departureAirport: 'IST',
    arrivalAirport: 'JFK',
    departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    arrivalTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
    aircraftType: 'Boeing 777',
    totalSeats: 350,
  };
}
function getMemorySnapshot() {
  const memUsage = process.memoryUsage();
  return {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
    external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
    rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100, // MB
  };
}
function generatePerformanceReport(testName, executionTime, threshold, memoryBefore, memoryAfter) {
  const memoryDelta = {
    heapUsed: Math.round((memoryAfter.heapUsed - memoryBefore.heapUsed) * 100) / 100,
    rss: Math.round((memoryAfter.rss - memoryBefore.rss) * 100) / 100,
  };
  const status = executionTime <= threshold ? '✓ PASS' : '✗ FAIL';
  return {
    testName,
    executionTime: `${executionTime.toFixed(2)}ms`,
    threshold: `${threshold}ms`,
    status,
    memoryBefore,
    memoryAfter,
    memoryDelta,
    heapUsedPercent: Math.round((memoryAfter.heapUsed / 500) * 100),
  };
}
function logPerformanceReport(report) {
  const separator = '─'.repeat(70);
  const statusSymbol = report.status.includes('PASS') ? '✓' : '✗';
  console.log(`\n${separator}`);
  console.log(`${statusSymbol} ${report.testName}`);
  console.log(`${separator}`);
  console.log(`⏱️  Execution Time:  ${report.executionTime} (Threshold: ${report.threshold})`);
  console.log(`   Status: ${report.status}`);
  console.log(`\n💾 Memory Usage:`);
  console.log(`   Before:  Heap ${report.memoryBefore.heapUsed}MB / RSS ${report.memoryBefore.rss}MB`);
  console.log(`   After:   Heap ${report.memoryAfter.heapUsed}MB / RSS ${report.memoryAfter.rss}MB`);
  console.log(`   Delta:   Heap ${report.memoryDelta.heapUsed}MB / RSS ${report.memoryDelta.rss}MB`);
  console.log(`   Heap Usage: ${report.heapUsedPercent}% of 500MB limit`);
  console.log(`${separator}\n`);
}
describe('Roster Generation Performance Tests', () => {
  beforeAll(() => {
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║     ROSTER GENERATION PERFORMANCE TEST SUITE                      ║');
    console.log('║                                                                   ║');
    console.log('║  Testing: rosterGenerationService.generateRoster()               ║');
    console.log('║  Framework: Jest + Node.js Performance API                       ║');
    console.log('║  Target Platform: Node.js v14+                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  });
  afterAll(() => {
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║              PERFORMANCE TEST SUITE COMPLETED                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  });
  describe('Load Testing with Different Data Sizes', () => {
    const loadTestScenarios = [
      [50, 5, 500, 'Small Load (50 passengers + 5 crew)'],
      [100, 8, 1000, 'Medium-Small Load (100 passengers + 8 crew)'],
      [200, 10, 2000, 'Medium Load (200 passengers + 10 crew)'],
      [350, 12, 3000, 'Medium-Large Load (350 passengers + 12 crew)'],
      [500, 15, 5000, 'Large Load (500 passengers + 15 crew)'],
      [750, 18, 7000, 'Very Large Load (750 passengers + 18 crew)'],
    ];
    test.each(loadTestScenarios)(
      'should generate roster for %s passengers and %s crew under %s ms threshold',
      (passengerCount, crewCount, thresholdMs, scenarioName) => {
        console.log(`\n🔄 Running: ${scenarioName}`);
        console.log(`   Passengers: ${passengerCount}, Crew: ${crewCount}, Threshold: ${thresholdMs}ms`);
        const flight = generateMockFlight('TK123');
        const passengers = generateMockPassengers(passengerCount);
        const crew = generateMockCrew(crewCount);
        console.log(`✓ Test data generated`);
        global.gc && global.gc();
        const memBefore = getMemorySnapshot();
        const startTime = performance.now();
        console.time(scenarioName);
        try {
          const roster = rosterGenerationService.generateRoster(
            flight.id,
            crew,
            passengers
          );
          console.timeEnd(scenarioName);
          const endTime = performance.now();
          const executionTime = endTime - startTime;
          const memAfter = getMemorySnapshot();
          const report = generatePerformanceReport(
            scenarioName,
            executionTime,
            thresholdMs,
            memBefore,
            memAfter
          );
          logPerformanceReport(report);
          expect(executionTime).toBeLessThan(thresholdMs);
          console.log(`✓ Execution time within threshold: ${executionTime.toFixed(2)}ms < ${thresholdMs}ms`);
          expect(memAfter.heapUsed).toBeLessThan(500);
          console.log(`✓ Memory usage within limit: ${memAfter.heapUsed}MB < 500MB`);
          expect(roster).toBeDefined();
          expect(roster.id).toBeDefined();
          console.log(`✓ Roster data validation passed`);
        } catch (error) {
          console.error(`✗ Test failed with error: ${error.message}`);
          throw error;
        }
      },
      30000
    );
  });
  describe('Stress Testing at Extreme Load', () => {
    test('should handle stress test with 1000 passengers and 20 crew without crashing', () => {
      console.log('\n🔥 STRESS TEST: 1000 passengers + 20 crew');
      const passengerCount = 1000;
      const crewCount = 20;
      const maxThreshold = 15000;
      const flight = generateMockFlight('TK999');
      const passengers = generateMockPassengers(passengerCount);
      const crew = generateMockCrew(crewCount);
      console.log(`✓ Stress test data generated`);
      global.gc && global.gc();
      const memBefore = getMemorySnapshot();
      const startTime = performance.now();
      console.time('Stress Test');
      try {
        const roster = rosterGenerationService.generateRoster(
          flight.id,
          crew,
          passengers
        );
        console.timeEnd('Stress Test');
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        const memAfter = getMemorySnapshot();
        const report = generatePerformanceReport(
          'Stress Test (1000 passengers)',
          executionTime,
          maxThreshold,
          memBefore,
          memAfter
        );
        logPerformanceReport(report);
        expect(executionTime).toBeLessThan(maxThreshold);
        console.log(`✓ Stress test completed: ${executionTime.toFixed(2)}ms < ${maxThreshold}ms`);
        expect(memAfter.heapUsed).toBeLessThan(700);
        console.log(`✓ Memory under control: ${memAfter.heapUsed}MB < 700MB`);
        expect(roster).toBeDefined();
        console.log(`✓ Stress test data validation passed`);
      } catch (error) {
        console.error(`✗ Stress test failed: ${error.message}`);
        throw error;
      }
    }, 30000);
  });
  describe('Memory Leak Detection', () => {
    test('should not leak memory when called repeatedly', () => {
      console.log('\n🔎 MEMORY LEAK DETECTION TEST');
      const passengerCount = 100;
      const crewCount = 8;
      const iterations = 10;
      const memorySnapshots = [];
      for (let i = 1; i <= iterations; i++) {
        console.log(`\n  Iteration ${i}/${iterations}`);
        const flight = generateMockFlight(`TK${String(i).padStart(3, '0')}`);
        const passengers = generateMockPassengers(passengerCount);
        const crew = generateMockCrew(crewCount);
        global.gc && global.gc();
        const memBefore = getMemorySnapshot();
        const startTime = performance.now();
        const roster = rosterGenerationService.generateRoster(
          flight.id,
          crew,
          passengers
        );
        const executionTime = performance.now() - startTime;
        const memAfter = getMemorySnapshot();
        memorySnapshots.push({
          iteration: i,
          heapUsed: memAfter.heapUsed,
          rss: memAfter.rss,
          executionTime: executionTime,
        });
        console.log(`    Heap: ${memAfter.heapUsed}MB, Execution: ${executionTime.toFixed(2)}ms`);
        expect(memAfter.heapUsed).toBeLessThan(500);
      }
      console.log('\n📊 Memory Trend Analysis:');
      const heapUsedValues = memorySnapshots.map(s => s.heapUsed);
      const avgHeapUsed = heapUsedValues.reduce((a, b) => a + b, 0) / heapUsedValues.length;
      const maxHeapUsed = Math.max(...heapUsedValues);
      const minHeapUsed = Math.min(...heapUsedValues);
      console.log(`   Average Heap: ${avgHeapUsed.toFixed(2)}MB`);
      console.log(`   Max Heap: ${maxHeapUsed.toFixed(2)}MB`);
      console.log(`   Min Heap: ${minHeapUsed.toFixed(2)}MB`);
      console.log(`   Heap Growth: ${(maxHeapUsed - minHeapUsed).toFixed(2)}MB`);
      const lastThree = heapUsedValues.slice(-3);
      const isIncreasing = lastThree[0] < lastThree[1] && lastThree[1] < lastThree[2];
      if (isIncreasing) {
        console.warn('⚠️  WARNING: Potential memory leak detected (consistent growth)');
      } else {
        console.log('✓ No memory leak detected');
      }
      expect(maxHeapUsed - minHeapUsed).toBeLessThan(200);
    }, 60000);
  });
  describe('Execution Time Consistency', () => {
    test('should have consistent execution time across multiple runs', () => {
      console.log('\n📈 EXECUTION TIME CONSISTENCY TEST');
      const passengerCount = 200;
      const crewCount = 10;
      const runs = 5;
      const executionTimes = [];
      for (let i = 1; i <= runs; i++) {
        console.log(`\n  Run ${i}/${runs}`);
        const flight = generateMockFlight(`TK${String(i).padStart(3, '0')}`);
        const passengers = generateMockPassengers(passengerCount);
        const crew = generateMockCrew(crewCount);
        global.gc && global.gc();
        const startTime = performance.now();
        const roster = rosterGenerationService.generateRoster(
          flight.id,
          crew,
          passengers
        );
        const executionTime = performance.now() - startTime;
        executionTimes.push(executionTime);
        console.log(`    Execution Time: ${executionTime.toFixed(2)}ms`);
      }
      console.log('\n📊 Statistical Analysis:');
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const minTime = Math.min(...executionTimes);
      const maxTime = Math.max(...executionTimes);
      const variance = executionTimes.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / executionTimes.length;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / avgTime) * 100;
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime.toFixed(2)}ms`);
      console.log(`   Max: ${maxTime.toFixed(2)}ms`);
      console.log(`   Std Dev: ${stdDev.toFixed(2)}ms`);
      console.log(`   Coefficient of Variation: ${cv.toFixed(2)}%`);
      if (cv < 10) {
        console.log('✓ EXCELLENT consistency (CV < 10%)');
      } else if (cv < 20) {
        console.log('✓ GOOD consistency (10% ≤ CV < 20%)');
      } else {
        console.warn('⚠️  WARNING: High variance detected (CV ≥ 20%)');
      }
      expect(maxTime - minTime).toBeLessThan(avgTime * 0.5);
      console.log(`✓ Time variance within acceptable range`);
    }, 60000);
  });
  describe('Scaling Analysis', () => {
    test('should scale linearly or better with data size', () => {
      console.log('\n📊 SCALING ANALYSIS TEST');
      const scalingTests = [
        { passengers: 100, crew: 8 },
        { passengers: 200, crew: 10 },
        { passengers: 400, crew: 14 },
        { passengers: 800, crew: 18 },
      ];
      const scalingResults = [];
      for (const testCase of scalingTests) {
        const { passengers, crew } = testCase;
        console.log(`\n  Testing: ${passengers} passengers, ${crew} crew`);
        const flight = generateMockFlight('TK123');
        const passengerList = generateMockPassengers(passengers);
        const crewList = generateMockCrew(crew);
        global.gc && global.gc();
        const startTime = performance.now();
        const roster = rosterGenerationService.generateRoster(
          flight.id,
          crewList,
          passengerList
        );
        const executionTime = performance.now() - startTime;
        const totalElements = passengers + crew;
        const timePerElement = executionTime / totalElements;
        scalingResults.push({
          passengers,
          crew,
          totalElements,
          executionTime,
          timePerElement,
        });
        console.log(`    Execution: ${executionTime.toFixed(2)}ms`);
        console.log(`    Time/Element: ${timePerElement.toFixed(4)}ms`);
      }
      console.log('\n📈 Scaling Behavior:');
      console.table(scalingResults.map(r => ({
        'Passengers': r.passengers,
        'Crew': r.crew,
        'Total': r.totalElements,
        'Time (ms)': r.executionTime.toFixed(2),
        'Time/Element': r.timePerElement.toFixed(4),
      })));
      const scaling = [];
      for (let i = 1; i < scalingResults.length; i++) {
        const prev = scalingResults[i - 1];
        const curr = scalingResults[i];
        const dataSizeRatio = curr.totalElements / prev.totalElements;
        const timeRatio = curr.executionTime / prev.executionTime;
        scaling.push({
          dataGrowth: `${(dataSizeRatio * 100).toFixed(0)}%`,
          timeGrowth: `${(timeRatio * 100).toFixed(0)}%`,
          isLinear: timeRatio <= dataSizeRatio * 1.1,
        });
      }
      console.log('\n📉 Growth Ratios:');
      scaling.forEach((s, i) => {
        const isLinearStr = s.isLinear ? '✓ Linear' : '⚠️ Super-linear';
        console.log(`  Step ${i + 1}: Data ${s.dataGrowth} → Time ${s.timeGrowth} (${isLinearStr})`);
      });
      const allLinear = scaling.every(s => s.isLinear);
      expect(allLinear).toBeTruthy();
      console.log(allLinear ? '✓ Scaling is linear or sub-linear' : '✗ Scaling is super-linear');
    }, 60000);
  });
});
