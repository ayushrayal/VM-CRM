import mongoose from 'mongoose';
import dns from 'dns';
import http from 'http';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import { calculateCreativeScore } from './src/services/creativeScoring.service.js';
import { calculateCroScore } from './src/services/croScoring.service.js';
import { Client } from './src/models/Client.js';
import { CreativePerformance } from './src/models/CreativePerformance.js';
import { CROExperiment } from './src/models/CROExperiment.js';
import { User } from './src/models/User.js';
import { env } from './src/config/env.js';
import app from './src/app.js';
import { generateToken } from './src/utils/jwt.js';

const runAllTests = async () => {
  console.log('\n===============================================================');
  console.log('🌟 VYTALIS MEDIA CRM: CLIENT BASELINE ROAS & PERFORMANCE SCORING');
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

  const PORT = 5099;
  let server;

  const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, `http://localhost:${PORT}`);
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(
        url,
        {
          method,
          headers
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ status: res.statusCode, body: parsed });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`✓ Test HTTP server listening on port ${PORT}\n`);

    // Clean up previous test artifacts
    await Client.deleteMany({ clientName: { $regex: /^\[SCORING-TEST\]/ } });
    await CreativePerformance.deleteMany({ adName: { $regex: /^\[SCORING-TEST\]/ } });
    await CROExperiment.deleteMany({ hypothesisTitle: { $regex: /^\[SCORING-TEST\]/ } });

    // Setup Admin User
    let adminUser = await User.findOne({ email: 'baseline_admin@vytalis.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Baseline Admin',
        email: 'baseline_admin@vytalis.com',
        password: 'Password123!',
        role: 'admin',
        teamRole: 'none',
        status: 'active',
        verified: true
      });
    } else {
      adminUser.status = 'active';
      await adminUser.save();
    }
    const adminToken = generateToken({ id: adminUser._id });

    // Setup Team User
    let teamUser = await User.findOne({ email: 'baseline_team@vytalis.com' });
    if (!teamUser) {
      teamUser = await User.create({
        name: 'Baseline Tester',
        email: 'baseline_team@vytalis.com',
        password: 'Password123!',
        role: 'team',
        teamRole: 'creative_strategist',
        status: 'active',
        verified: true
      });
    } else {
      teamUser.status = 'active';
      await teamUser.save();
    }
    const teamToken = generateToken({ id: teamUser._id });

    // Create a Client with Baseline ROAS = 5.0
    const clientRes = await request(
      'POST',
      '/api/clients',
      {
        clientName: '[SCORING-TEST] Acme Corp',
        baselineROAS: 5.0,
        currentROAS: 5.0,
        description: 'Test client for baseline evaluation'
      },
      adminToken
    );
    assert(clientRes.status === 201, 'Client created with baselineROAS = 5.0');
    const clientId = clientRes.body?.data?._id;
    assert(clientRes.body?.data?.baselineROAS === 5.0, 'Client directory stores baselineROAS = 5.0');

    // -------------------------------------------------------------
    // TEST 1: Creative ROAS above baseline = 1 point
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Creative ROAS above baseline = 1 point ---');
    const scoreAbove = calculateCreativeScore({ roas: 6.0, baselineROAS: 5.0 });
    assert(scoreAbove.totalPoints === 1, 'Service: ROAS 6.0 > baseline 5.0 awards exactly 1 point');

    const apiAboveRes = await request(
      'POST',
      '/api/creative/creatives',
      {
        clientId,
        clientName: '[SCORING-TEST] Acme Corp',
        adName: '[SCORING-TEST] Above Baseline Ad',
        roas: 6.0,
        status: 'WINNER'
      },
      teamToken
    );
    assert(apiAboveRes.status === 201, 'API: Created creative above baseline');
    assert(apiAboveRes.body?.data?.score?.totalPoints === 1, 'API: Score calculated as exactly 1 point');
    assert(apiAboveRes.body?.data?.baselineROAS === 5.0, 'API: Referenced client baselineROAS 5.0');

    // Verify client's currentROAS is updated to reflect latest recorded performance (6.0), but baseline remains 5.0
    const updatedClient1 = await Client.findById(clientId);
    assert(updatedClient1.currentROAS === 6.0, 'Client currentROAS reflects latest recorded performance (6.0)');
    assert(updatedClient1.baselineROAS === 5.0, 'Client baselineROAS remains unchanged reference value (5.0)');

    // -------------------------------------------------------------
    // TEST 2: Creative ROAS equal to or below baseline = 0 points
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Creative ROAS equal to or below baseline = 0 points ---');
    const scoreEqual = calculateCreativeScore({ roas: 5.0, baselineROAS: 5.0 });
    assert(scoreEqual.totalPoints === 0, 'Service: ROAS 5.0 == baseline 5.0 awards 0 points');

    const scoreBelow = calculateCreativeScore({ roas: 4.2, baselineROAS: 5.0 });
    assert(scoreBelow.totalPoints === 0, 'Service: ROAS 4.2 < baseline 5.0 awards 0 points');

    const apiEqualRes = await request(
      'POST',
      '/api/creative/creatives',
      {
        clientId,
        adName: '[SCORING-TEST] Equal Baseline Ad',
        roas: 5.0,
        status: 'AVERAGE'
      },
      teamToken
    );
    assert(apiEqualRes.body?.data?.score?.totalPoints === 0, 'API: Server awards 0 points for ROAS == baseline');

    const apiBelowRes = await request(
      'POST',
      '/api/creative/creatives',
      {
        clientId,
        adName: '[SCORING-TEST] Below Baseline Ad',
        roas: 3.5,
        status: 'LOSER'
      },
      teamToken
    );
    assert(apiBelowRes.body?.data?.score?.totalPoints === 0, 'API: Server awards 0 points for ROAS < baseline');

    // -------------------------------------------------------------
    // TEST 3: A very small positive ROAS improvement still earns only 1 point
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Very small positive ROAS improvement still earns only 1 point ---');
    const scoreSmall = calculateCreativeScore({ roas: 5.01, baselineROAS: 5.0 });
    assert(scoreSmall.totalPoints === 1, 'Service: 5.01 vs baseline 5.0 earns exactly 1 point');

    const scoreLarge = calculateCreativeScore({ roas: 20.0, baselineROAS: 5.0 });
    assert(scoreLarge.totalPoints === 1, 'Service: 20.0 vs baseline 5.0 also earns only 1 point (no delta scaling)');

    const apiSmallRes = await request(
      'POST',
      '/api/creative/creatives',
      {
        clientId,
        adName: '[SCORING-TEST] Micro improvement Ad',
        roas: 5.05,
        status: 'WINNER'
      },
      teamToken
    );
    assert(apiSmallRes.body?.data?.score?.totalPoints === 1, 'API: 5.05 vs baseline 5.0 awards exactly 1 point');

    // -------------------------------------------------------------
    // TEST 4: Product Sales improvement = 1 point
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Product Sales improvement = 1 point ---');
    const salesOnlyScore = calculateCroScore({
      salesBefore: 1000,
      salesAfter: 1001,
      prepaidBefore: 50,
      prepaidAfter: 50
    });
    assert(salesOnlyScore.salesPoints === 1, 'Service: salesAfter > salesBefore earns 1 sales point');
    assert(salesOnlyScore.prepaidPoints === 0, 'Service: prepaid unchanged earns 0 prepaid points');
    assert(salesOnlyScore.totalPoints === 1, 'Service: Total score is 1 point for sales improvement only');

    const croSalesRes = await request(
      'POST',
      '/api/cro/experiments',
      {
        clientId,
        hypothesisTitle: '[SCORING-TEST] Sales Boost Test',
        hypothesis: 'Optimize product page',
        startDate: '2026-10-01',
        status: 'SUCCESSFUL',
        results: {
          salesBefore: 20000,
          salesAfter: 25000,
          prepaidBefore: 40,
          prepaidAfter: 40
        }
      },
      teamToken
    );
    assert(croSalesRes.status === 201, 'API: Created CRO experiment with sales improvement');
    assert(croSalesRes.body?.data?.score?.totalPoints === 1, 'API: Awards 1 point for sales improvement');
    assert(croSalesRes.body?.data?.score?.salesPoints === 1, 'API: score.salesPoints is 1');

    // -------------------------------------------------------------
    // TEST 5: Prepaid Orders improvement = 1 point
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Prepaid Orders improvement = 1 point ---');
    const prepaidOnlyScore = calculateCroScore({
      salesBefore: 1000,
      salesAfter: 1000,
      prepaidBefore: 30,
      prepaidAfter: 35
    });
    assert(prepaidOnlyScore.prepaidPoints === 1, 'Service: prepaidAfter > prepaidBefore earns 1 prepaid point');
    assert(prepaidOnlyScore.salesPoints === 0, 'Service: sales unchanged earns 0 sales points');
    assert(prepaidOnlyScore.totalPoints === 1, 'Service: Total score is 1 point for prepaid improvement only');

    const croPrepaidRes = await request(
      'POST',
      '/api/cro/experiments',
      {
        clientId,
        hypothesisTitle: '[SCORING-TEST] Prepaid Incentive Test',
        hypothesis: 'Free gift for prepaid orders',
        startDate: '2026-10-01',
        status: 'SUCCESSFUL',
        results: {
          salesBefore: 5000,
          salesAfter: 5000,
          prepaidBefore: 25,
          prepaidAfter: 30
        }
      },
      teamToken
    );
    assert(croPrepaidRes.body?.data?.score?.totalPoints === 1, 'API: Awards 1 point for prepaid improvement only');
    assert(croPrepaidRes.body?.data?.score?.prepaidPoints === 1, 'API: score.prepaidPoints is 1');

    // -------------------------------------------------------------
    // TEST 6: Both CRO metrics improve = 2 points maximum
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Both CRO metrics improve = 2 points maximum ---');
    const bothScore = calculateCroScore({
      salesBefore: 1000,
      salesAfter: 2000,
      prepaidBefore: 20,
      prepaidAfter: 40
    });
    assert(bothScore.salesPoints === 1, 'Service: Sales improved = 1 pt');
    assert(bothScore.prepaidPoints === 1, 'Service: Prepaid improved = 1 pt');
    assert(bothScore.totalPoints === 2, 'Service: Both metrics improved = exactly 2 points maximum');

    const croBothRes = await request(
      'POST',
      '/api/cro/experiments',
      {
        clientId,
        hypothesisTitle: '[SCORING-TEST] Full Funnel Overhaul',
        hypothesis: 'New checkout and pricing design',
        startDate: '2026-10-01',
        status: 'SUCCESSFUL',
        results: {
          salesBefore: 10000,
          salesAfter: 15000,
          prepaidBefore: 30,
          prepaidAfter: 45
        }
      },
      teamToken
    );
    assert(croBothRes.body?.data?.score?.totalPoints === 2, 'API: Both metrics improved awards exactly 2 points max');
    assert(croBothRes.body?.data?.score?.salesPoints === 1, 'API: salesPoints is 1');
    assert(croBothRes.body?.data?.score?.prepaidPoints === 1, 'API: prepaidPoints is 1');

    // -------------------------------------------------------------
    // TEST 7: No improvement or a decrease earns 0 points for that metric
    // -------------------------------------------------------------
    console.log('\n--- Test 7: No improvement or a decrease earns 0 points ---');
    const decreaseScore = calculateCroScore({
      salesBefore: 5000,
      salesAfter: 4000, // decreased
      prepaidBefore: 40,
      prepaidAfter: 35 // decreased
    });
    assert(decreaseScore.salesPoints === 0, 'Service: Decreased sales earns 0 points');
    assert(decreaseScore.prepaidPoints === 0, 'Service: Decreased prepaid earns 0 points');
    assert(decreaseScore.totalPoints === 0, 'Service: Both decreased earns 0 total points');

    const equalScoreCro = calculateCroScore({
      salesBefore: 5000,
      salesAfter: 5000, // equal
      prepaidBefore: 40,
      prepaidAfter: 40 // equal
    });
    assert(equalScoreCro.totalPoints === 0, 'Service: Equal metrics earn 0 total points');

    // -------------------------------------------------------------
    // TEST 8: Cancellation Rate is no longer required or scored
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Cancellation Rate is no longer required or scored ---');
    // Payload with NO cancellation rate fields should succeed
    const croNoCancelRes = await request(
      'POST',
      '/api/cro/experiments',
      {
        clientId,
        hypothesisTitle: '[SCORING-TEST] No Cancellation In Payload',
        hypothesis: 'Test validation without cancellation',
        startDate: '2026-10-01',
        status: 'COMPLETED',
        results: {
          salesBefore: 1000,
          salesAfter: 1500
        }
      },
      teamToken
    );
    assert(croNoCancelRes.status === 201, 'API: Request without cancellation fields succeeds');
    assert(croNoCancelRes.body?.data?.score?.cancellationPoints === 0, 'API: cancellationPoints is strictly 0');

    // If cancellation rate is passed in historical data, it must NOT alter score
    const cancellationIgnoredScore = calculateCroScore({
      salesBefore: 1000,
      salesAfter: 1000,
      prepaidBefore: 30,
      prepaidAfter: 30,
      cancellationBefore: 50,
      cancellationAfter: 10 // Big reduction in cancellation
    });
    assert(
      cancellationIgnoredScore.totalPoints === 0,
      'Service: Cancellation rate improvement awards 0 points (completely ignored in scoring)'
    );

    // -------------------------------------------------------------
    // TEST 9: Leaderboard totals match the new scoring rules
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Leaderboard totals match the new scoring rules ---');
    const crLeaderboardRes = await request('GET', '/api/creative/leaderboard', null, teamToken);
    assert(crLeaderboardRes.status === 200, 'API: Creative Leaderboard returns 200');
    const crEntry = (crLeaderboardRes.body?.data || []).find((e) => String(e.creatorId) === String(teamUser._id));
    assert(Boolean(crEntry), 'Creative Leaderboard contains team user');
    // Team user submitted:
    // 1. roas 6.0 (> 5.0) -> +1
    // 2. roas 5.0 (== 5.0) -> 0
    // 3. roas 3.5 (< 5.0) -> 0
    // 4. roas 5.05 (> 5.0) -> +1
    // Total should be exactly 2 points
    assert(crEntry.totalPoints === 2, `Creative Leaderboard points = 2 (actual: ${crEntry.totalPoints})`);

    const croLeaderboardRes = await request('GET', '/api/cro/leaderboard', null, teamToken);
    assert(croLeaderboardRes.status === 200, 'API: CRO Leaderboard returns 200');
    const croEntry = (croLeaderboardRes.body?.data || []).find((e) => String(e.creatorId) === String(teamUser._id));
    assert(Boolean(croEntry), 'CRO Leaderboard contains team user');
    // Team user submitted CRO:
    // 1. Sales only (+1) -> 1 pt
    // 2. Prepaid only (+1) -> 1 pt
    // 3. Both (+2) -> 2 pts
    // 4. Sales only (+1) -> 1 pt
    // Total should be exactly 5 points
    assert(croEntry.totalPoints === 5, `CRO Leaderboard points = 5 (actual: ${croEntry.totalPoints})`);

    // -------------------------------------------------------------
    // TEST 10: Existing auth, permissions, client management, and Creative Strategy work
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Existing auth, permissions, client management, and Creative Strategy ---');
    // Unauthenticated user cannot create or access clients
    const unauthClientCreate = await request(
      'POST',
      '/api/clients',
      { clientName: '[SCORING-TEST] Unauthenticated Client' },
      null
    );
    assert(unauthClientCreate.status === 401, 'Auth: Unauthenticated request cannot create clients (401)');

    // Non-admin cannot delete a client
    const unauthorizedClientDelete = await request(
      'DELETE',
      `/api/clients/${clientId}`,
      null,
      teamToken
    );
    assert(unauthorizedClientDelete.status === 403, 'Permissions: Non-admin cannot delete client (403)');

    // Admin can update client baseline ROAS
    const updateClientRes = await request(
      'PATCH',
      `/api/clients/${clientId}`,
      { baselineROAS: 6.5 },
      adminToken
    );
    assert(updateClientRes.status === 200, 'Admin can update client baselineROAS');
    assert(updateClientRes.body?.data?.baselineROAS === 6.5, 'Client baselineROAS updated to 6.5');

    // Creative Strategy client list integration
    const csListRes = await request('GET', '/api/clients', null, teamToken);
    assert(csListRes.status === 200, 'Creative Strategy: Can fetch clients list');
    const clientExistsInCS = (csListRes.body?.data || []).some((c) => c._id === clientId);
    assert(clientExistsInCS, 'Creative Strategy: Client exists in central directory for selection');

    // Clean up test data
    console.log('\n--- Cleaning up test records ---');
    await CreativePerformance.deleteMany({ adName: { $regex: /^\[SCORING-TEST\]/ } });
    await CROExperiment.deleteMany({ hypothesisTitle: { $regex: /^\[SCORING-TEST\]/ } });
    await Client.deleteMany({ clientName: { $regex: /^\[SCORING-TEST\]/ } });
    await User.deleteMany({ email: { $in: ['baseline_admin@vytalis.com', 'baseline_team@vytalis.com'] } });
    console.log('✓ Cleanup complete');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
};

runAllTests();
