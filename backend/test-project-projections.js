import mongoose from 'mongoose';
import dns from 'dns';
import http from 'http';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import { Client } from './src/models/Client.js';
import { User } from './src/models/User.js';
import { ProjectProjection } from './src/models/ProjectProjection.js';
import { env } from './src/config/env.js';
import app from './src/app.js';
import { generateToken } from './src/utils/jwt.js';
import { calculateProjectionMetrics } from './src/utils/projectionCalculations.js';

const runProjectProjectionsTests = async () => {
  console.log('\n===============================================================');
  console.log('🔍 PROJECT PROJECTIONS COMPREHENSIVE BACKEND VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  };

  let server;
  const PORT = 5092;
  const BASE_URL = `http://localhost:${PORT}`;

  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Clean up any previous test projections and test clients
    const testClientNames = ['[proj_test] tpc wellness', '[proj_test] oodle media'];
    await Client.deleteMany({ normalizedName: { $in: testClientNames } });

    // Setup Admin User
    let adminUser = await User.findOne({ email: 'proj_test_admin@vytalis.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Projection Test Admin',
        email: 'proj_test_admin@vytalis.com',
        password: 'Password123!',
        role: 'admin',
        teamRole: 'none',
        status: 'active'
      });
    }
    const adminToken = generateToken({ id: adminUser._id });

    // Start ephemeral server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`✓ Test HTTP server listening on port ${PORT}`);

    // Create 2 Test Clients
    const clientA = await Client.create({
      name: '[PROJ_TEST] TPC Wellness',
      clientName: '[PROJ_TEST] TPC Wellness',
      code: 'TPCW',
      baselineROAS: 4.0,
      currentROAS: 4.0,
      status: 'active'
    });

    const clientB = await Client.create({
      name: '[PROJ_TEST] Oodle Media',
      clientName: '[PROJ_TEST] Oodle Media',
      code: 'OODL',
      baselineROAS: 3.5,
      currentROAS: 3.5,
      status: 'active'
    });

    await ProjectProjection.deleteMany({ client: { $in: [clientA._id, clientB._id] } });

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    };

    // ==============================================================
    // TEST 1: Pure Calculation Engine Verification (Deterministic)
    // ==============================================================
    console.log('\n--- 1. Pure Calculation Engine Verification ---');
    {
      // Using prompt scenario:
      // Oct 2026 (31 days). Reference date: 10 Oct 2026.
      // Days gone = 10, Remaining = 21.
      // Target Spend = 8,00,000, Target Revenue = 32,00,000, Target ROAS = 4.
      // Daily Budget = 25,000.
      // Actual Spend = 2,00,000.
      // Actual Revenue = 2,00,000.
      const mockProjection = {
        month: 10,
        year: 2026,
        targetSpend: 800000,
        targetRevenue: 3200000,
        targetROAS: 4,
        currentDailyBudget: 25000,
        dailyTracking: [
          { date: '2026-10-01', actualSpend: 200000, actualRevenue: 200000 }
        ]
      };
      const refDate = new Date(2026, 9, 10); // Oct 10, 2026
      const metrics = calculateProjectionMetrics(mockProjection, refDate);

      assert(metrics.daysInMonth === 31, 'Days in October 2026 is 31');
      assert(metrics.daysGone === 10, 'Days gone on Oct 10 is 10');
      assert(metrics.remainingDays === 21, 'Remaining days is 21');
      assert(metrics.totalActualSpend === 200000, 'Total actual spend is 2,00,000');
      assert(metrics.totalActualRevenue === 200000, 'Total actual revenue is 2,00,000');
      // Average daily revenue = 2,00,000 / 10 = 20,000
      assert(metrics.averageDailyRevenue === 20000, 'Average daily revenue is 20,000');
      // Forecasted future spend = 25,000 * 21 = 5,25,000
      assert(metrics.forecastedFutureSpend === 525000, 'Forecasted future spend is 5,25,000');
      // Forecasted monthly spend = 2,00,000 + 5,25,000 = 7,25,000
      assert(metrics.forecastedMonthlySpend === 725000, 'Forecasted monthly spend is 7,25,000');
      // Forecasted future revenue = 20,000 * 21 = 4,20,000
      assert(metrics.forecastedFutureRevenue === 420000, 'Forecasted future revenue is 4,20,000');
      // Forecasted monthly revenue = 2,00,000 + 4,20,000 = 6,20,000
      assert(metrics.forecastedMonthlyRevenue === 620000, 'Forecasted monthly revenue is 6,20,000');
      // Spend Gap = 8,00,000 - 7,25,000 = 75,000
      assert(metrics.spendGap === 75000, 'Spend gap is 75,000');
      // Revenue Gap = 32,00,000 - 6,20,000 = 25,80,000
      assert(metrics.revenueGap === 2580000, 'Revenue gap is 25,80,000');
      // ROAS calculations
      assert(metrics.actualROAS === 1, 'Actual ROAS is 1x (200k / 200k)');
      assert(metrics.forecastedROAS === Math.round((620000 / 725000) * 100) / 100, 'Forecasted ROAS correctly calculated');
      assert(metrics.targetROAS === 4, 'Target ROAS is 4x');
      assert(metrics.roasGap === Math.round((4 - metrics.forecastedROAS) * 100) / 100, 'ROAS gap is accurate');
    }

    // ==============================================================
    // TEST 2: Zero Spend Handling & Past/Future Month Logic
    // ==============================================================
    console.log('\n--- 2. Zero-Spend and Boundary Month Logic ---');
    {
      const zeroSpendProj = {
        month: 10,
        year: 2026,
        targetSpend: 500000,
        targetRevenue: 2000000,
        targetROAS: 4,
        currentDailyBudget: 0,
        dailyTracking: []
      };
      const zeroMetrics = calculateProjectionMetrics(zeroSpendProj, new Date(2026, 9, 1));
      assert(zeroMetrics.actualROAS === 0, 'Zero spend returns actualROAS 0 without divide-by-zero error');
      assert(zeroMetrics.forecastedROAS === 0, 'Zero spend returns forecastedROAS 0 without error');
      assert(zeroMetrics.hasDailyData === false, 'hasDailyData is false when no entries exist');

      // Past month test (September 2026 viewed in October 2026)
      const pastProj = {
        month: 9,
        year: 2026,
        targetSpend: 600000,
        targetRevenue: 2400000,
        targetROAS: 4,
        currentDailyBudget: 20000,
        dailyTracking: [{ date: '2026-09-15', actualSpend: 550000, actualRevenue: 2200000 }]
      };
      const pastMetrics = calculateProjectionMetrics(pastProj, new Date(2026, 9, 8));
      assert(pastMetrics.daysGone === 30, 'Past month daysGone equals full daysInMonth (30)');
      assert(pastMetrics.remainingDays === 0, 'Past month remainingDays is 0');
      assert(pastMetrics.forecastedMonthlySpend === 550000, 'Past month forecasted spend equals actual spend');

      // Future month test (November 2026 viewed in October 2026)
      const futureProj = {
        month: 11,
        year: 2026,
        targetSpend: 900000,
        targetRevenue: 3600000,
        targetROAS: 4,
        currentDailyBudget: 30000,
        dailyTracking: []
      };
      const futureMetrics = calculateProjectionMetrics(futureProj, new Date(2026, 9, 8));
      assert(futureMetrics.daysGone === 0, 'Future month daysGone is 0');
      assert(futureMetrics.remainingDays === 30, 'Future month remainingDays is 30');
      assert(futureMetrics.forecastedMonthlySpend === 30000 * 30, 'Future month forecasted spend equals budget * 30');
    }

    // ==============================================================
    // TEST 3: POST /api/projections Creation & Central Client Linking
    // ==============================================================
    console.log('\n--- 3. API Projection Creation ---');
    const createRes = await fetch(`${BASE_URL}/api/projections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clientId: clientA._id.toString(),
        month: 10,
        year: 2026,
        targetSpend: 800000,
        targetRevenue: 3200000,
        targetROAS: 4.0,
        currentDailyBudget: 25000,
        notes: 'October high-season target'
      })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'POST /api/projections returns 201 Created');
    assert(createData.success === true, 'Response indicates success');
    assert(createData.data._id !== undefined, 'Projection has valid MongoDB _id');
    assert(createData.data.client._id.toString() === clientA._id.toString(), 'References central Client ID');
    assert(createData.data.currentDailyBudget === 25000, 'Initial daily budget stored as 25,000');
    assert(createData.data.budgetHistory.length === 1, 'Initial budget history entry recorded');
    assert(createData.data.calculations !== undefined, 'Server-calculated metrics returned');

    const projectionId = createData.data._id;

    // ==============================================================
    // TEST 4: Duplicate Monthly Projection Prevention
    // ==============================================================
    console.log('\n--- 4. Duplicate Monthly Projection Prevention ---');
    const dupRes = await fetch(`${BASE_URL}/api/projections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clientId: clientA._id.toString(),
        month: 10,
        year: 2026,
        targetSpend: 800000,
        targetRevenue: 3200000,
        targetROAS: 4.0,
        currentDailyBudget: 25000
      })
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 400, 'Duplicate projection rejected with 400 Bad Request');
    assert(dupData.message.includes('already exists'), 'Rejection message warns duplicate projection exists');

    // ==============================================================
    // TEST 5: Daily Tracking Addition & Totals Recalculation
    // ==============================================================
    console.log('\n--- 5. Daily Actual Performance Entry ---');
    // Day 1
    const day1Res = await fetch(`${BASE_URL}/api/projections/${projectionId}/daily`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: '2026-10-01',
        actualSpend: 22000,
        actualRevenue: 55000,
        notes: 'Day 1 campaigns live'
      })
    });
    const day1Data = await day1Res.json();
    assert(day1Res.status === 200, 'Day 1 actual performance logged');
    assert(day1Data.data.calculations.totalActualSpend === 22000, 'Total actual spend updated to 22,000');
    assert(day1Data.data.calculations.totalActualRevenue === 55000, 'Total actual revenue updated to 55,000');
    assert(day1Data.data.calculations.actualROAS === 2.5, 'Actual ROAS is 55k / 22k = 2.5x');

    // Day 2
    const day2Res = await fetch(`${BASE_URL}/api/projections/${projectionId}/daily`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: '2026-10-02',
        actualSpend: 28000,
        actualRevenue: 70000
      })
    });
    const day2Data = await day2Res.json();
    assert(day2Res.status === 200, 'Day 2 actual performance logged');
    assert(day2Data.data.calculations.totalActualSpend === 50000, 'Total actual spend updated to 50,000 (22k + 28k)');
    assert(day2Data.data.calculations.totalActualRevenue === 125000, 'Total actual revenue updated to 1,25,000');

    // Day 3
    await fetch(`${BASE_URL}/api/projections/${projectionId}/daily`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: '2026-10-03',
        actualSpend: 24000,
        actualRevenue: 61000
      })
    });

    // ==============================================================
    // TEST 6: Upsert Logic: Editing Existing Date Does NOT Create Duplicate
    // ==============================================================
    console.log('\n--- 6. Upsert Daily Record (No Duplicate for Same Date) ---');
    const updateDay2Res = await fetch(`${BASE_URL}/api/projections/${projectionId}/daily`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: '2026-10-02',
        actualSpend: 31500, // Updated from 28000
        actualRevenue: 80000  // Updated from 70000
      })
    });
    const updateDay2Data = await updateDay2Res.json();
    assert(updateDay2Res.status === 200, 'POST for existing date succeeded');
    // Check that dailyTracking still has exactly 3 entries, not 4
    assert(updateDay2Data.data.dailyTracking.length === 3, 'dailyTracking array length is 3 (upserted without duplicate)');
    // Total spend = 22,000 + 31,500 + 24,000 = 77,500
    assert(updateDay2Data.data.calculations.totalActualSpend === 77500, 'Total actual spend recalculated to 77,500');
    // Total revenue = 55,000 + 80,000 + 61,000 = 1,96,000
    assert(updateDay2Data.data.calculations.totalActualRevenue === 196000, 'Total actual revenue recalculated to 1,96,000');

    // ==============================================================
    // TEST 7: Current Daily Budget Update & Budget History Preservation
    // ==============================================================
    console.log('\n--- 7. Current Daily Budget Update & Historical Integrity ---');
    const prevActualSpend = updateDay2Data.data.calculations.totalActualSpend;
    const prevForecastSpend = updateDay2Data.data.calculations.forecastedMonthlySpend;

    const patchBudgetRes = await fetch(`${BASE_URL}/api/projections/${projectionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        currentDailyBudget: 35000 // Scaled from 25,000 to 35,000
      })
    });
    const patchBudgetData = await patchBudgetRes.json();
    assert(patchBudgetRes.status === 200, 'PATCH projection daily budget returned 200');
    assert(patchBudgetData.data.currentDailyBudget === 35000, 'Current daily budget updated to 35,000');
    assert(patchBudgetData.data.budgetHistory.length === 2, 'Budget change appended to budgetHistory log');
    assert(patchBudgetData.data.budgetHistory[1].budget === 35000, 'Budget history log contains new budget');
    // CRITICAL: Historical actual spend must NOT have changed!
    assert(
      patchBudgetData.data.calculations.totalActualSpend === prevActualSpend,
      'Historical actual spend remains UNCHANGED after budget update'
    );
    // Forecast spend MUST have recalculated
    assert(
      patchBudgetData.data.calculations.forecastedMonthlySpend > prevForecastSpend,
      'Forecasted spend recalculated higher due to higher daily budget'
    );

    // ==============================================================
    // TEST 8: Invalid Date Mismatch Validation
    // ==============================================================
    console.log('\n--- 8. Date Validation (Out of Month Period) ---');
    const invalidDateRes = await fetch(`${BASE_URL}/api/projections/${projectionId}/daily`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: '2026-11-05', // November date for October projection
        actualSpend: 10000,
        actualRevenue: 30000
      })
    });
    assert(invalidDateRes.status === 400, 'Date outside projection period rejected with 400');

    // ==============================================================
    // TEST 9: Client B Isolation
    // ==============================================================
    console.log('\n--- 9. Multiple Client Isolation ---');
    const clientBProjRes = await fetch(`${BASE_URL}/api/projections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clientId: clientB._id.toString(),
        month: 10,
        year: 2026,
        targetSpend: 500000,
        targetRevenue: 1800000,
        targetROAS: 3.6,
        currentDailyBudget: 15000
      })
    });
    const clientBProjData = await clientBProjRes.json();
    assert(clientBProjRes.status === 201, 'Client B projection created');
    assert(clientBProjData.data.client._id.toString() === clientB._id.toString(), 'Belongs to Client B');
    assert(clientBProjData.data.dailyTracking.length === 0, 'Client B has independent dailyTracking (empty)');

    // Query list
    const listRes = await fetch(`${BASE_URL}/api/projections?month=10&year=2026`, { headers });
    const listData = await listRes.json();
    assert(listRes.status === 200, 'GET /api/projections returns 200');
    assert(listData.data.length >= 2, 'Returns projections for multiple clients');

    // ==============================================================
    // TEST 10: Delete Daily Entry
    // ==============================================================
    console.log('\n--- 10. Delete Daily Entry & Recalculate ---');
    const dayToDelete = patchBudgetData.data.dailyTracking[0];
    const delDailyRes = await fetch(
      `${BASE_URL}/api/projections/${projectionId}/daily/${dayToDelete._id}`,
      { method: 'DELETE', headers }
    );
    const delDailyData = await delDailyRes.json();
    assert(delDailyRes.status === 200, 'DELETE daily tracking entry succeeded');
    assert(delDailyData.data.dailyTracking.length === 2, 'Daily tracking entry removed');
    assert(
      delDailyData.data.calculations.totalActualSpend < prevActualSpend,
      'Total actual spend reduced after deleting entry'
    );

    // ==============================================================
    // TEST 11: Cleanup Test Records
    // ==============================================================
    console.log('\n--- 11. Cleanup ---');
    await ProjectProjection.deleteMany({ client: { $in: [clientA._id, clientB._id] } });
    await Client.deleteMany({ _id: { $in: [clientA._id, clientB._id] } });
    console.log('✓ Cleaned up test projections and clients');

  } catch (err) {
    console.error('Test execution failed:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('✓ Test HTTP server closed');
    }
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
};

runProjectProjectionsTests();
