import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { User } from './src/models/User.js';
import { Client } from './src/models/Client.js';
import { Campaign } from './src/models/Campaign.js';
import { AdSet } from './src/models/AdSet.js';
import { CreativeStrategy } from './src/models/CreativeStrategy.js';
import { CreativeStrategyTimeline } from './src/models/CreativeStrategyTimeline.js';
import { Notification } from './src/models/Notification.js';

import * as clientService from './src/services/client.service.js';
import * as campaignService from './src/services/campaign.service.js';
import * as adSetService from './src/services/adSet.service.js';
import * as creativeStrategyService from './src/services/creativeStrategy.service.js';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dotenv.config();

const runTests = async () => {
  console.log('====================================================');
  console.log('CREATIVE STRATEGY WORKFLOW AUDIT FIXES VERIFICATION');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  try {
    // 0. Setup Mock Users
    // Admin (System Admin / Final Approver)
    let testAdmin = await User.findOne({ email: 'audit_admin@test.com' });
    if (!testAdmin) {
      testAdmin = await User.create({
        name: 'Abhishek Admin',
        email: 'audit_admin@test.com',
        password: 'Password123!',
        role: 'admin',
        teamRole: 'none',
        status: 'active'
      });
    }

    // Assigned Media Buyer
    let testMB = await User.findOne({ email: 'audit_mb@test.com' });
    if (!testMB) {
      testMB = await User.create({
        name: 'Rahul Buyer',
        email: 'audit_mb@test.com',
        password: 'Password123!',
        role: 'team',
        teamRole: 'media_buyer',
        status: 'active'
      });
    }

    // Unassigned Media Buyer (for testing user isolation)
    let otherMB = await User.findOne({ email: 'audit_other_mb@test.com' });
    if (!otherMB) {
      otherMB = await User.create({
        name: 'Vikram Other Buyer',
        email: 'audit_other_mb@test.com',
        password: 'Password123!',
        role: 'team',
        teamRole: 'media_buyer',
        status: 'active'
      });
    }

    // Assigned Creative Strategist
    let testCS = await User.findOne({ email: 'audit_cs@test.com' });
    if (!testCS) {
      testCS = await User.create({
        name: 'Priya Strategist',
        email: 'audit_cs@test.com',
        password: 'Password123!',
        role: 'team',
        teamRole: 'creative_strategist',
        status: 'active'
      });
    }

    // Assigned Graphic Designer
    let testGD = await User.findOne({ email: 'audit_gd@test.com' });
    if (!testGD) {
      testGD = await User.create({
        name: 'Rohan Designer',
        email: 'audit_gd@test.com',
        password: 'Password123!',
        role: 'team',
        teamRole: 'graphic_designer',
        status: 'active'
      });
    }

    console.log('✓ Test users ready (Admin, Assigned MB, Other MB, Assigned CS, Assigned GD)');

    // Setup Test Hierarchy
    const client = await clientService.createClient({
      name: `AuditClient_${Date.now()}`,
      code: 'AC',
      description: 'Audit Test Client',
      userId: testAdmin._id
    });

    const campaign = await campaignService.createCampaign({
      name: 'Audit | CBO | Testing Campaign',
      clientId: client._id.toString(),
      launchDate: new Date(),
      status: 'ACTIVE',
      notes: 'Audit campaign',
      userId: testAdmin._id
    });

    const adSet = await adSetService.createAdSet({
      name: 'Audit | AdSet 1 | UGC Videos',
      campaignId: campaign._id.toString(),
      launchDate: new Date(),
      status: 'ACTIVE',
      currentTestingCycle: 1,
      userId: testAdmin._id
    });

    const record = await creativeStrategyService.createCreativeStrategy(
      {
        clientId: client._id.toString(),
        campaignId: campaign._id.toString(),
        adSetId: adSet._id.toString(),
        cycleNumber: 1,
        currentTestingCycle: 'Cycle 1',
        assignedMediaBuyer: testMB._id.toString(),
        assignedCreativeStrategist: testCS._id.toString(),
        assignedGraphicDesigner: testGD._id.toString(),
        assignedTo: testMB._id.toString(),
        creativeName: 'UGC Hook Variation A',
        creativesProposed: 'UGC Hook Variation A'
      },
      testAdmin
    );
    console.log(`✓ Record created: ${record._id} (${record.currentTestingCycle}) in status: ${record.status}`);

    // =========================================================================
    // TEST 1: Wrong teamRole cannot submit operational action (Must return 403)
    // =========================================================================
    console.log('\n--- TEST 1: Wrong teamRole cannot submit operational action ---');
    let test1Passed = false;
    try {
      // testMB has teamRole 'media_buyer', attempting to submit CS performance analysis
      await creativeStrategyService.submitPerformanceAnalysis(
        record._id,
        {
          ctr: 2.5,
          cpc: 12.0,
          cpm: 150.0,
          roas: 3.2,
          performanceAnalysis: 'Hacked analysis by MB'
        },
        testMB
      );
    } catch (err) {
      if (err.statusCode === 403) {
        test1Passed = true;
        console.log(`✓ TEST 1 PASSED: Media Buyer rejected from CS operational action with 403: "${err.message}"`);
      } else {
        console.error(`❌ TEST 1 FAILED with unexpected error:`, err);
      }
    }
    if (!test1Passed) throw new Error('TEST 1 FAILED: Wrong teamRole was NOT blocked with 403!');

    // =========================================================================
    // TEST 2: Correct role but wrong assigned user cannot submit (Must return 403)
    // =========================================================================
    console.log('\n--- TEST 2: Correct role but unassigned user cannot submit ---');
    let test2Passed = false;
    try {
      // otherMB has teamRole 'media_buyer', but is NOT the assignedMediaBuyer on this record
      await creativeStrategyService.launchCreative(
        record._id,
        { launchProof: 'https://business.facebook.com/ads/other' },
        otherMB
      );
    } catch (err) {
      if (err.statusCode === 403) {
        test2Passed = true;
        console.log(`✓ TEST 2 PASSED: Unassigned Media Buyer rejected with 403: "${err.message}"`);
      } else {
        console.error(`❌ TEST 2 FAILED with unexpected error:`, err);
      }
    }
    if (!test2Passed) throw new Error('TEST 2 FAILED: Unassigned user was NOT blocked with 403!');

    // =========================================================================
    // TEST 3: Admin cannot perform worker actions (Must return 403)
    // =========================================================================
    console.log('\n--- TEST 3: Admin cannot perform worker operational submissions ---');
    let test3Passed = false;
    try {
      // Admin attempting to launch creative (operational worker action)
      await creativeStrategyService.launchCreative(
        record._id,
        { launchProof: 'https://business.facebook.com/ads/admin' },
        testAdmin
      );
    } catch (err) {
      if (err.statusCode === 403) {
        test3Passed = true;
        console.log(`✓ TEST 3 PASSED: Admin blocked from worker operational action with 403: "${err.message}"`);
      } else {
        console.error(`❌ TEST 3 FAILED with unexpected error:`, err);
      }
    }
    if (!test3Passed) throw new Error('TEST 3 FAILED: Admin was permitted to perform worker operational submission!');

    // Launch by assigned MB (Legitimate action)
    const launched = await creativeStrategyService.launchCreative(
      record._id,
      { launchProof: 'https://business.facebook.com/ads/valid' },
      testMB
    );
    console.log(`✓ Assigned Media Buyer launched creative. Status: ${launched.status}`);

    // =========================================================================
    // TEST 4: Report before 72h is rejected (Must return 400)
    // =========================================================================
    console.log('\n--- TEST 4: Report before 72h is rejected ---');
    let test4Passed = false;
    try {
      await creativeStrategyService.submitReport(
        record._id,
        { ctr: 2.1, cpc: 10.5, cpm: 120.0, roas: 3.1, performanceNotes: 'Premature' },
        testMB
      );
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('72 hours')) {
        test4Passed = true;
        console.log(`✓ TEST 4 PASSED: Report submission before 72h locked with 400: "${err.message}"`);
      } else {
        console.error(`❌ TEST 4 FAILED with unexpected error:`, err);
      }
    }
    if (!test4Passed) throw new Error('TEST 4 FAILED: 72-hour report lock was bypassed!');

    // =========================================================================
    // TEST 5: Report after 72h succeeds
    // =========================================================================
    console.log('\n--- TEST 5: Report after 72h succeeds ---');
    // Fast-forward launch timestamp by 73 hours
    await CreativeStrategy.findByIdAndUpdate(record._id, {
      launchedAt: new Date(Date.now() - 73 * 3600 * 1000)
    });
    const reportRecord = await creativeStrategyService.submitReport(
      record._id,
      {
        ctr: 2.45,
        cpc: 9.8,
        cpm: 110.0,
        roas: 3.4,
        performanceNotes: 'Strong top of funnel click-through',
        additionalObservations: 'Desktop outperformed mobile'
      },
      testMB
    );
    if (reportRecord.status === 'REPORT_SUBMITTED' && reportRecord.reportSubmittedAt) {
      console.log(`✓ TEST 5 PASSED: Report submitted successfully after 72h. Status: ${reportRecord.status}`);
    } else {
      throw new Error('TEST 5 FAILED: Report submission failed after 72h lock elapsed.');
    }

    // =========================================================================
    // TEST 6: Performance analysis persists atomically
    // =========================================================================
    console.log('\n--- TEST 6: Performance analysis persists atomically ---');
    const perfRecord = await creativeStrategyService.submitPerformanceAnalysis(
      record._id,
      {
        ctr: 2.45,
        cpc: 9.8,
        cpm: 110.0,
        roas: 3.4,
        performanceAnalysis: 'CTR is above industry benchmark of 1.8%, strong creative interest.',
        recommendation: 'SCALE',
        analysisNotes: 'Increase CBO budget by 20% on next iteration.'
      },
      testCS
    );

    const checkRecord1 = await CreativeStrategy.findById(record._id);
    if (
      checkRecord1.performanceAnalysis === 'CTR is above industry benchmark of 1.8%, strong creative interest.' &&
      checkRecord1.recommendation === 'SCALE' &&
      checkRecord1.analysisNotes === 'Increase CBO budget by 20% on next iteration.'
    ) {
      console.log('✓ TEST 6 PASSED: performanceAnalysis, recommendation, and analysisNotes persisted perfectly.');
    } else {
      throw new Error('TEST 6 FAILED: Performance analysis fields were dropped or not persisted!');
    }

    // =========================================================================
    // TEST 7: Creative analysis persists atomically & updates status
    // =========================================================================
    console.log('\n--- TEST 7: Creative analysis persists atomically ---');
    const learningsRecord = await creativeStrategyService.submitLearnings(
      record._id,
      {
        angle: 'Problem Agitation UGC',
        concept: 'First 3 seconds pain-point demonstration',
        communication: 'Direct and relatable consumer tone',
        psychology: 'Loss aversion and urgency',
        hook: 'Stop wasting time on manual CRM updates',
        creativeStructure: 'Hook -> Problem -> Demonstration -> Social Proof -> CTA',
        creativeAnalysisNotes: 'Hook hold rate at 3s was 68%',
        creativeLearning: 'Visual text overlays boosted retention significantly',
        creativeLearningNotes: 'Designer must add bold yellow typography',
        assignedGraphicDesigner: testGD._id.toString()
      },
      testCS
    );

    const checkRecord2 = await CreativeStrategy.findById(record._id);
    if (
      checkRecord2.status === 'LEARNINGS_SUBMITTED' &&
      checkRecord2.angle === 'Problem Agitation UGC' &&
      checkRecord2.concept === 'First 3 seconds pain-point demonstration' &&
      checkRecord2.hook === 'Stop wasting time on manual CRM updates' &&
      checkRecord2.creativeLearning === 'Visual text overlays boosted retention significantly' &&
      checkRecord2.assignedGraphicDesigner.toString() === testGD._id.toString()
    ) {
      console.log('✓ TEST 7 PASSED: Creative breakdown persisted atomically and status -> LEARNINGS_SUBMITTED.');
    } else {
      throw new Error('TEST 7 FAILED: Creative analysis fields or status update failed!');
    }

    // =========================================================================
    // TEST 8: Brief revision workflow works (No deadlock)
    // =========================================================================
    console.log('\n--- TEST 8: Brief revision workflow (No deadlock) ---');
    // Step 8a: GD creates initial brief
    const initialBrief = await creativeStrategyService.createBrief(
      record._id,
      {
        briefTitle: 'Brief V1 - UGC Pain Point',
        briefDescription: 'Create a 15s UGC video focusing on morning frustration.'
      },
      testGD
    );
    if (initialBrief.status !== 'BRIEF_SUBMITTED') throw new Error('Initial brief submission failed');
    console.log(`✓ 8a. Graphic Designer submitted brief. Status: ${initialBrief.status}`);

    // Step 8b: CS requests revision
    const briefRevisionRequested = await creativeStrategyService.reviewBrief(
      record._id,
      { status: 'REVISE', feedback: 'Please emphasize the hook in the first 2 seconds.' },
      testCS
    );
    if (
      briefRevisionRequested.status !== 'REVISION_REQUESTED' ||
      briefRevisionRequested.briefStatus !== 'REVISE'
    ) {
      throw new Error('Brief revision request failed');
    }
    console.log(`✓ 8b. Creative Strategist requested revision. Status: ${briefRevisionRequested.status}`);

    // Step 8c: GD re-submits revised brief (Must be accepted during REVISION_REQUESTED)
    const revisedBriefSubmitted = await creativeStrategyService.createBrief(
      record._id,
      {
        briefTitle: 'Brief V2 - Revised UGC with 2s Hook',
        briefDescription: 'Updated brief: opening frame shows bold text overlay in 1.5s.'
      },
      testGD
    );
    if (revisedBriefSubmitted.status !== 'BRIEF_SUBMITTED') {
      throw new Error('Revised brief re-submission failed');
    }
    console.log(`✓ 8c. Graphic Designer re-submitted revised brief. Status: ${revisedBriefSubmitted.status}`);

    // Step 8d: CS approves revised brief
    const briefApproved = await creativeStrategyService.reviewBrief(
      record._id,
      { status: 'APPROVED', feedback: 'Perfect revisions, approved for production!' },
      testCS
    );
    if (briefApproved.status !== 'PRODUCTION' || briefApproved.briefStatus !== 'APPROVED') {
      throw new Error('Brief approval failed');
    }
    console.log(`✓ TEST 8 PASSED: Brief approved and moved to PRODUCTION. Status: ${briefApproved.status}`);

    // =========================================================================
    // TEST 9: Creative revision workflow works (No deadlock)
    // =========================================================================
    console.log('\n--- TEST 9: Creative asset revision workflow (No deadlock) ---');
    // Step 9a: GD submits initial creative assets
    const initialCreative = await creativeStrategyService.submitCreativeProduction(
      record._id,
      {
        creativeLink: 'https://drive.google.com/asset-v1',
        framerLink: 'https://framer.com/v1',
        creativeSubmissionNotes: 'First cut of UGC video'
      },
      testGD
    );
    if (initialCreative.status !== 'INTERNAL_REVIEW') throw new Error('Initial creative submission failed');
    console.log(`✓ 9a. Graphic Designer submitted creative assets. Status: ${initialCreative.status}`);

    // Step 9b: CS requests revision on internal review
    const creativeRevisionRequested = await creativeStrategyService.reviewInternalCreative(
      record._id,
      { status: 'REVISE', feedback: 'Sound balance needs adjustment; vocal audio is slightly low.' },
      testCS
    );
    if (
      creativeRevisionRequested.status !== 'REVISION_REQUESTED' ||
      creativeRevisionRequested.internalReviewStatus !== 'REVISE'
    ) {
      throw new Error('Internal review revision request failed');
    }
    console.log(`✓ 9b. Creative Strategist requested creative revision. Status: ${creativeRevisionRequested.status}`);

    // Step 9c: GD re-submits revised creative assets
    const revisedCreativeSubmitted = await creativeStrategyService.submitCreativeProduction(
      record._id,
      {
        creativeLink: 'https://drive.google.com/asset-v2-fixed-audio',
        framerLink: 'https://framer.com/v2',
        creativeSubmissionNotes: 'Audio normalized to -14 LUFS.'
      },
      testGD
    );
    if (revisedCreativeSubmitted.status !== 'INTERNAL_REVIEW') {
      throw new Error('Revised creative re-submission failed');
    }
    console.log(`✓ 9c. Graphic Designer re-submitted revised creative. Status: ${revisedCreativeSubmitted.status}`);

    // Step 9d: CS approves internal review
    const creativeApproved = await creativeStrategyService.reviewInternalCreative(
      record._id,
      { status: 'APPROVED', feedback: 'Audio is crystal clear. Ready for final approval.' },
      testCS
    );
    if (creativeApproved.status !== 'CLIENT_REVIEW' || creativeApproved.internalReviewStatus !== 'APPROVED') {
      throw new Error('Internal review approval failed');
    }
    console.log(`✓ TEST 9 PASSED: Internal review approved, moved to CLIENT_REVIEW. Status: ${creativeApproved.status}`);

    // =========================================================================
    // TEST 10: Notifications generated for every important handoff
    // =========================================================================
    console.log('\n--- TEST 10: Verify notifications generated for all handoffs ---');
    const notifications = await Notification.find({ creativeStrategy: record._id });
    console.log(`✓ Total notifications generated for this record: ${notifications.length}`);
    const notificationTypes = notifications.map((n) => n.type);
    console.log(`   Captured types: ${notificationTypes.join(', ')}`);

    if (
      !notificationTypes.includes('CREATIVE_LAUNCHED') ||
      !notificationTypes.includes('REPORT_SUBMITTED') ||
      !notificationTypes.includes('LEARNINGS_SUBMITTED') ||
      !notificationTypes.includes('BRIEF_SUBMITTED') ||
      !notificationTypes.includes('BRIEF_APPROVED') ||
      !notificationTypes.includes('CREATIVE_SUBMITTED') ||
      !notificationTypes.includes('INTERNAL_REVIEW_APPROVED')
    ) {
      throw new Error('TEST 10 FAILED: Missing essential handoff notifications!');
    }
    console.log('✓ TEST 10 PASSED: All essential workflow notifications verified.');

    // =========================================================================
    // TEST 11: Final approval transitions to READY_TO_LAUNCH
    // =========================================================================
    console.log('\n--- TEST 11: Final approval by Admin transitions to READY_TO_LAUNCH ---');
    const finalApproval = await creativeStrategyService.clientReviewDecision(
      record._id,
      { decision: 'APPROVED', feedback: 'Approved for scale. Launch immediately with $250/day.' },
      testAdmin
    );
    if (
      finalApproval.status !== 'READY_TO_LAUNCH' ||
      finalApproval.finalApprovalStatus !== 'APPROVED' ||
      !finalApproval.finalApprovedAt
    ) {
      throw new Error(`Final approval failed to set status to READY_TO_LAUNCH: status=${finalApproval.status}, approvalStatus=${finalApproval.finalApprovalStatus}, approvedAt=${finalApproval.finalApprovedAt}`);
    }
    console.log(`✓ TEST 11 PASSED: Final approval succeeded. Status: ${finalApproval.status}`);

    // =========================================================================
    // TEST 12 & 14: Next cycle creation and race condition protection
    // =========================================================================
    console.log('\n--- TEST 12 & 14: Next cycle creation & idempotency protection ---');
    // Media Buyer launches next cycle
    const cycle1Result = await creativeStrategyService.completeAndCreateNextCycle(record._id, testMB);
    const cycle1 = cycle1Result.completedRecord;
    const cycle2 = cycle1Result.nextRecord;

    if (cycle1.status !== 'COMPLETED' || !cycle1.completedAt || !cycle1.nextCycle) {
      throw new Error('Cycle 1 not correctly marked COMPLETED');
    }
    const nextCycleId = (cycle1.nextCycle?._id || cycle1.nextCycle).toString();
    if (
      (cycle2.status !== 'LAUNCHED' && cycle2.status !== 'PENDING_LAUNCH') ||
      cycle2.cycleNumber !== 2 ||
      nextCycleId !== cycle2._id.toString()
    ) {
      throw new Error(`Cycle 2 not correctly spawned: status=${cycle2.status}, cycleNumber=${cycle2.cycleNumber}, nextCycleId=${nextCycleId}`);
    }
    console.log(`✓ Cycle 1 permanently COMPLETED. Cycle 2 spawned: ${cycle2._id} (Cycle ${cycle2.cycleNumber}) in status: ${cycle2.status}`);

    // Verify Race Condition: Duplicate call MUST be rejected with 400
    let test12Passed = false;
    try {
      await creativeStrategyService.completeAndCreateNextCycle(record._id, testMB);
    } catch (err) {
      if (err.statusCode === 400 && (err.message.toLowerCase().includes('completed') || err.message.toLowerCase().includes('immutable'))) {
        test12Passed = true;
        console.log(`✓ TEST 12 PASSED: Duplicate next cycle creation rejected with 400: "${err.message}"`);
      } else {
        console.error(`❌ TEST 12 FAILED with unexpected error:`, err);
      }
    }
    if (!test12Passed) throw new Error('TEST 12 FAILED: Duplicate next cycle was not rejected!');

    // Verify Cycle 2 is created exactly once in database
    const cycleCount = await CreativeStrategy.countDocuments({
      adSet: adSet._id,
      cycleNumber: 2
    });
    if (cycleCount === 1) {
      console.log(`✓ TEST 14 PASSED: Exactly 1 Cycle 2 document exists in database.`);
    } else {
      throw new Error(`TEST 14 FAILED: Expected exactly 1 Cycle 2, found: ${cycleCount}`);
    }

    // =========================================================================
    // TEST 13: Completed cycle cannot be modified (Immutability)
    // =========================================================================
    console.log('\n--- TEST 13: Completed cycle immutability ---');
    let test13Passed = false;
    try {
      await creativeStrategyService.updateCreativeStrategy(
        cycle1._id,
        { performanceNotes: 'Trying to tamper with completed historical report' },
        testAdmin
      );
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('immutable')) {
        test13Passed = true;
        console.log(`✓ TEST 13 PASSED: Tampering with completed cycle blocked with 400: "${err.message}"`);
      } else {
        console.error(`❌ TEST 13 FAILED with unexpected error:`, err);
      }
    }
    if (!test13Passed) throw new Error('TEST 13 FAILED: Completed cycle was not immutable!');

    // =========================================================================
    // TEST 15: Audit timeline contains all expected events
    // =========================================================================
    console.log('\n--- TEST 15: Audit timeline verification ---');
    const timeline = await creativeStrategyService.getTimeline(cycle1._id);
    console.log(`✓ Total audit timeline events recorded: ${timeline.length}`);
    const timelineActions = timeline.map((e) => e.action);
    console.log(`   Recorded actions:\n   - ${timelineActions.join('\n   - ')}`);

    const expectedActions = [
      'CREATIVE_LAUNCHED',
      'REPORT_SUBMITTED',
      'PERFORMANCE_ANALYSIS_SUBMITTED',
      'LEARNINGS_SUBMITTED',
      'BRIEF_CREATED',
      'BRIEF_APPROVED',
      'CREATIVE_SUBMITTED',
      'INTERNAL_REVIEW_APPROVED',
      'CLIENT_APPROVED',
      'CYCLE_COMPLETED'
    ];

    for (const exp of expectedActions) {
      if (!timelineActions.includes(exp)) {
        throw new Error(`TEST 15 FAILED: Missing expected timeline action: ${exp}`);
      }
    }
    // =========================================================================
    // TEST 16: Admin assigns an unassigned task & timeline / notification
    // =========================================================================
    console.log('\n--- TEST 16: Admin assigns an unassigned task ---');
    const unassignedRecord = await creativeStrategyService.createCreativeStrategy(
      {
        clientId: client._id.toString(),
        campaignId: campaign._id.toString(),
        adSetId: adSet._id.toString(),
        cycleNumber: 10,
        currentTestingCycle: 'Cycle 10',
        creativeName: 'Unassigned Test Record',
        creativesProposed: 'Unassigned Test Record'
        // no assignedTo
      },
      testAdmin
    );
    if (unassignedRecord.assignedTo) {
      throw new Error('TEST 16 FAILED: Record should start unassigned');
    }
    console.log(`✓ Created unassigned record: ${unassignedRecord._id}`);

    // Admin assigns testCS
    const assignedRecord = await creativeStrategyService.updateCreativeStrategy(
      unassignedRecord._id,
      { assignedTo: testCS._id.toString() },
      testAdmin
    );
    const assigned16Id = (assignedRecord.assignedTo?._id || assignedRecord.assignedTo)?.toString();
    if (assigned16Id !== testCS._id.toString()) {
      throw new Error(`TEST 16 FAILED: Record not assigned to testCS: ${assignedRecord.assignedTo}`);
    }
    const tl16 = await creativeStrategyService.getTimeline(unassignedRecord._id);
    const assignCreatedAction = tl16.find((e) => e.action === 'ASSIGNMENT_CREATED');
    if (!assignCreatedAction) {
      throw new Error('TEST 16 FAILED: Timeline missing ASSIGNMENT_CREATED action');
    }
    const notif16 = await Notification.findOne({
      creativeStrategy: unassignedRecord._id,
      recipient: testCS._id,
      type: 'ASSIGNMENT_UPDATED'
    });
    if (!notif16) {
      throw new Error('TEST 16 FAILED: Notification not found for newly assigned user');
    }
    console.log('✓ TEST 16 PASSED: Admin assigned unassigned record, timeline logged ASSIGNMENT_CREATED, notification delivered.');

    // =========================================================================
    // TEST 17: Admin self-assigns task
    // =========================================================================
    console.log('\n--- TEST 17: Admin self-assignment ---');
    const selfAssignedRecord = await creativeStrategyService.updateCreativeStrategy(
      unassignedRecord._id,
      { assignedTo: testAdmin._id.toString() },
      testAdmin
    );
    const selfAssignedId = (selfAssignedRecord.assignedTo?._id || selfAssignedRecord.assignedTo)?.toString();
    if (selfAssignedId !== testAdmin._id.toString()) {
      throw new Error('TEST 17 FAILED: Admin self-assignment failed to persist');
    }
    console.log('✓ TEST 17 PASSED: Admin successfully assigned task to themselves.');

    // =========================================================================
    // TEST 18: Admin reassigns task from one user to another
    // =========================================================================
    console.log('\n--- TEST 18: Admin reassigns task from one user to another ---');
    const reassignedRecord = await creativeStrategyService.updateCreativeStrategy(
      unassignedRecord._id,
      { assignedTo: testMB._id.toString() },
      testAdmin
    );
    const reassignedId = (reassignedRecord.assignedTo?._id || reassignedRecord.assignedTo)?.toString();
    if (reassignedId !== testMB._id.toString()) {
      throw new Error('TEST 18 FAILED: Reassignment to testMB failed to persist');
    }
    const tl18 = await creativeStrategyService.getTimeline(unassignedRecord._id);
    const reassignAction = tl18.find((e) => e.action === 'ASSIGNMENT_REASSIGNED');
    if (!reassignAction) {
      throw new Error('TEST 18 FAILED: Timeline missing ASSIGNMENT_REASSIGNED action');
    }
    const notif18 = await Notification.findOne({
      creativeStrategy: unassignedRecord._id,
      recipient: testMB._id,
      type: 'ASSIGNMENT_UPDATED'
    });
    if (!notif18) {
      throw new Error('TEST 18 FAILED: Notification not found for reassigned testMB');
    }
    console.log('✓ TEST 18 PASSED: Admin reassigned task, timeline logged ASSIGNMENT_REASSIGNED, notification delivered.');

    // =========================================================================
    // TEST 19: Non-admin is blocked from editing assignment (403 Forbidden)
    // =========================================================================
    console.log('\n--- TEST 19: Non-admin blocked from editing assignment ---');
    let test19Passed = false;
    try {
      await creativeStrategyService.updateCreativeStrategy(
        unassignedRecord._id,
        { assignedTo: testGD._id.toString() },
        testMB
      );
    } catch (err) {
      if (err.statusCode === 403) {
        test19Passed = true;
        console.log(`✓ TEST 19 PASSED: Non-admin blocked with 403: "${err.message}"`);
      } else {
        console.error('❌ TEST 19 FAILED with unexpected error:', err);
      }
    }
    if (!test19Passed) throw new Error('TEST 19 FAILED: Non-admin was permitted to edit assignment!');

    // =========================================================================
    // TEST 20: Task created without launch date (UNSCHEDULED) & scheduled later
    // =========================================================================
    console.log('\n--- TEST 20: Unscheduled task creation and scheduling later ---');
    const unscheduledTask = await creativeStrategyService.createCreativeStrategy(
      {
        clientId: client._id.toString(),
        campaignId: campaign._id.toString(),
        adSetId: adSet._id.toString(),
        cycleNumber: 11,
        currentTestingCycle: 'Cycle 11',
        creativeName: 'Unscheduled Test Record',
        creativesProposed: 'Unscheduled Test Record'
      },
      testAdmin
    );
    if (unscheduledTask.launchDate || unscheduledTask.reportDueAt) {
      throw new Error('TEST 20 FAILED: Unscheduled record should not have launchDate or reportDueAt');
    }
    console.log('✓ Unscheduled record created with null launchDate and null reportDueAt');

    const scheduledDate = new Date();
    const scheduledTask = await creativeStrategyService.updateCreativeStrategy(
      unscheduledTask._id,
      {
        launchDate: scheduledDate,
        observationDurationHours: 72
      },
      testAdmin
    );
    if (!scheduledTask.launchDate || !scheduledTask.reportDueAt) {
      throw new Error('TEST 20 FAILED: Scheduled task missing launchDate or reportDueAt');
    }
    const tl20 = await creativeStrategyService.getTimeline(unscheduledTask._id);
    const schedCreatedAction = tl20.find((e) => e.action === 'SCHEDULE_CREATED');
    if (!schedCreatedAction) {
      throw new Error('TEST 20 FAILED: Timeline missing SCHEDULE_CREATED action');
    }
    console.log(`✓ TEST 20 PASSED: Record scheduled later. reportDueAt calculated: ${scheduledTask.reportDueAt}`);

    // =========================================================================
    // TEST 21: Custom observation duration (48 hours and 53 hours / 2d 5h)
    // =========================================================================
    console.log('\n--- TEST 21: Custom observation duration calculation ---');
    const baseLaunch = new Date('2026-10-10T10:00:00.000Z');
    const task48h = await creativeStrategyService.updateCreativeStrategy(
      unscheduledTask._id,
      {
        launchDate: baseLaunch,
        observationDurationHours: 48,
        schedulingMode: 'DURATION'
      },
      testAdmin
    );
    const expected48hDue = new Date(baseLaunch.getTime() + 48 * 3600 * 1000).toISOString();
    if (new Date(task48h.reportDueAt).toISOString() !== expected48hDue) {
      throw new Error(`TEST 21 FAILED: 48h due date mismatch: expected ${expected48hDue}, got ${task48h.reportDueAt}`);
    }
    console.log(`✓ 48h observation duration verified: due at ${task48h.reportDueAt}`);

    // Test 53 hours (2 days 5 hours = 48 + 5 = 53h)
    const task53h = await creativeStrategyService.updateCreativeStrategy(
      unscheduledTask._id,
      {
        launchDate: baseLaunch,
        observationDurationHours: 53,
        schedulingMode: 'DURATION'
      },
      testAdmin
    );
    const expected53hDue = new Date(baseLaunch.getTime() + 53 * 3600 * 1000).toISOString();
    if (new Date(task53h.reportDueAt).toISOString() !== expected53hDue) {
      throw new Error(`TEST 21 FAILED: 53h due date mismatch: expected ${expected53hDue}, got ${task53h.reportDueAt}`);
    }
    console.log(`✓ TEST 21 PASSED: 53h (2d 5h) observation duration verified: due at ${task53h.reportDueAt}`);

    // =========================================================================
    // TEST 22: Custom due date/time option works & rejects due date before launch
    // =========================================================================
    console.log('\n--- TEST 22: Custom due date validation & acceptance ---');
    // Try custom due date BEFORE launch date -> MUST reject with 400
    let test22RejectPassed = false;
    const invalidDueDate = new Date(baseLaunch.getTime() - 3600 * 1000); // 1 hour before
    try {
      await creativeStrategyService.updateCreativeStrategy(
        unscheduledTask._id,
        {
          schedulingMode: 'CUSTOM_DUE_DATE',
          reportDueAt: invalidDueDate
        },
        testAdmin
      );
    } catch (err) {
      if (err.statusCode === 400 && err.message.toLowerCase().includes('after')) {
        test22RejectPassed = true;
        console.log(`✓ Invalid custom due date before launch correctly rejected with 400: "${err.message}"`);
      } else {
        console.error('❌ TEST 22 invalid date rejected with unexpected error:', err);
      }
    }
    if (!test22RejectPassed) throw new Error('TEST 22 FAILED: Custom due date before launch date was not rejected!');

    // Valid custom due date
    const validCustomDueDate = new Date('2026-10-15T18:30:00.000Z');
    const taskCustomDue = await creativeStrategyService.updateCreativeStrategy(
      unscheduledTask._id,
      {
        schedulingMode: 'CUSTOM_DUE_DATE',
        reportDueAt: validCustomDueDate
      },
      testAdmin
    );
    if (new Date(taskCustomDue.reportDueAt).toISOString() !== validCustomDueDate.toISOString()) {
      throw new Error('TEST 22 FAILED: Valid custom due date was not saved properly');
    }
    console.log(`✓ TEST 22 PASSED: Valid custom due date set and preserved: ${taskCustomDue.reportDueAt}`);

    // =========================================================================
    // TEST 23: Editing schedule after launch updates active cycle timing without duplicate cycle
    // =========================================================================
    console.log('\n--- TEST 23: Schedule edit after launch updates timing without duplicate cycle ---');
    // cycle2 is currently active (cycleNumber: 2)
    const activeCycleBefore = await CreativeStrategy.findById(cycle2._id);
    const newLaunchTime = new Date('2026-10-12T08:00:00.000Z');
    const updatedCycle2 = await creativeStrategyService.updateCreativeStrategy(
      cycle2._id,
      {
        launchDate: newLaunchTime,
        observationDurationHours: 24,
        schedulingMode: 'DURATION'
      },
      testAdmin
    );
    if (updatedCycle2.status === 'COMPLETED' || updatedCycle2.completedAt) {
      throw new Error('TEST 23 FAILED: Active cycle was marked completed prematurely!');
    }
    if (new Date(updatedCycle2.launchDate).toISOString() !== newLaunchTime.toISOString()) {
      throw new Error('TEST 23 FAILED: launchDate not updated on active cycle');
    }
    const expectedActiveDue = new Date(newLaunchTime.getTime() + 24 * 3600 * 1000).toISOString();
    if (new Date(updatedCycle2.reportDueAt).toISOString() !== expectedActiveDue) {
      throw new Error(`TEST 23 FAILED: reportDueAt mismatch on active cycle: expected ${expectedActiveDue}, got ${updatedCycle2.reportDueAt}`);
    }
    const totalCycle2Docs = await CreativeStrategy.countDocuments({
      adSet: adSet._id,
      cycleNumber: 2
    });
    if (totalCycle2Docs !== 1) {
      throw new Error(`TEST 23 FAILED: Expected 1 Cycle 2 document, found ${totalCycle2Docs}`);
    }
    console.log('✓ TEST 23 PASSED: Active cycle updated in-place without duplicate cycle or completing prematurely.');

    // Clean up temporary test records before cascade test
    await CreativeStrategy.deleteMany({ _id: { $in: [unassignedRecord._id, unscheduledTask._id] } });
    await CreativeStrategyTimeline.deleteMany({ creativeStrategy: { $in: [unassignedRecord._id, unscheduledTask._id] } });

    // =========================================================================
    // TEST 24: Admin cascade deletion leaves zero orphan records
    // =========================================================================
    console.log('\n--- TEST 24: Admin cascade deletion leaves zero orphan records ---');
    const preview = await clientService.getClientDeletePreview(client._id);
    console.log(
      `✓ Delete Preview: Client "${preview.clientName}" -> ${preview.campaignsCount} campaigns, ${preview.adSetsCount} ad sets, ${preview.recordsCount} records`
    );

    const deleteResult = await clientService.deleteClient(client._id);
    console.log(`✓ Client cascade deleted: ${deleteResult.clientName}`);

    // Verify database state: no orphans in any collection
    const orphansClient = await Client.findById(client._id);
    const orphansCampaigns = await Campaign.find({ client: client._id });
    const orphansAdSets = await AdSet.find({ client: client._id });
    const orphansRecords = await CreativeStrategy.find({ client: client._id });
    const orphansTimeline1 = await CreativeStrategyTimeline.find({ creativeStrategy: cycle1._id });
    const orphansTimeline2 = await CreativeStrategyTimeline.find({ creativeStrategy: cycle2._id });

    if (
      orphansClient ||
      orphansCampaigns.length > 0 ||
      orphansAdSets.length > 0 ||
      orphansRecords.length > 0 ||
      orphansTimeline1.length > 0 ||
      orphansTimeline2.length > 0
    ) {
      throw new Error('TEST 24 FAILED: Orphan records found after cascade delete!');
    }
    console.log('✓ TEST 24 PASSED: Cascade deletion verified. Zero orphan records left in database.');

    // Cleanup test users
    await User.deleteMany({
      email: {
        $in: [
          'audit_admin@test.com',
          'audit_mb@test.com',
          'audit_other_mb@test.com',
          'audit_cs@test.com',
          'audit_gd@test.com'
        ]
      }
    });
    console.log('✓ Cleaned up test users');

    console.log('\n====================================================');
    console.log('🎉 ALL 24 AUDIT & EDITABLE WORKFLOW TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runTests();
