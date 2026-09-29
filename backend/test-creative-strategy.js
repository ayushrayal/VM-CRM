import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import { Client } from './src/models/Client.js';
import { Campaign } from './src/models/Campaign.js';
import { AdSet } from './src/models/AdSet.js';
import { CreativeStrategy } from './src/models/CreativeStrategy.js';
import { CreativeStrategyTimeline } from './src/models/CreativeStrategyTimeline.js';
import * as clientService from './src/services/client.service.js';
import * as campaignService from './src/services/campaign.service.js';
import * as adSetService from './src/services/adSet.service.js';
import * as creativeStrategyService from './src/services/creativeStrategy.service.js';

import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dotenv.config();

const runTests = async () => {
  console.log('=== STARTING CREATIVE STRATEGY INTEGRATION TESTS ===');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  try {
    // 1. Setup mock users
    let testAdmin = await User.findOne({ email: 'test_admin@test.com' });
    if (!testAdmin) {
      testAdmin = await User.create({
        name: 'Test Admin',
        email: 'test_admin@test.com',
        password: 'Password123!',
        role: 'admin',
        teamRole: 'none',
        status: 'active'
      });
    }

    let testMB = await User.findOne({ email: 'test_mb@test.com' });
    if (!testMB) {
      testMB = await User.create({
        name: 'Rahul Buyer',
        email: 'test_mb@test.com',
        password: 'Password123!',
        role: 'team',
        teamRole: 'media_buyer',
        status: 'active'
      });
    }

    let testCS = await User.findOne({ email: 'test_cs@test.com' });
    if (!testCS) {
      testCS = await User.create({
        name: 'Priya Strategist',
        email: 'test_cs@test.com',
        password: 'Password123!',
        role: 'team',
        teamRole: 'creative_strategist',
        status: 'active'
      });
    }

    let testGD = await User.findOne({ email: 'test_gd@test.com' });
    if (!testGD) {
      testGD = await User.create({
        name: 'Rohan Designer',
        email: 'test_gd@test.com',
        password: 'Password123!',
        role: 'team',
        teamRole: 'graphic_designer',
        status: 'active'
      });
    }
    console.log('✓ Test users ready (Admin, MB, CS, GD)');

    // 2. Client Creation
    const clientName = `TestClient_${Date.now()}`;
    const client = await clientService.createClient({
      name: clientName,
      code: 'TC',
      description: 'Test Client Description',
      userId: testAdmin._id
    });
    console.log(`✓ Client created: ${client.name} (${client._id})`);

    // 3. Campaign Creation
    const campaign = await campaignService.createCampaign({
      name: 'VM | CBO | B | 10/09/2026',
      clientId: client._id.toString(),
      launchDate: new Date(),
      status: 'ACTIVE',
      notes: 'Initial Q4 Campaign',
      userId: testAdmin._id
    });
    console.log(`✓ Campaign created: ${campaign.name} under ${client.name}`);

    // 4. Ad Set Creation
    const adSet = await adSetService.createAdSet({
      name: 'VM | CBO | B | Top Cities',
      campaignId: campaign._id.toString(),
      launchDate: new Date(),
      status: 'ACTIVE',
      currentTestingCycle: 1,
      userId: testAdmin._id
    });
    console.log(`✓ Ad Set created: ${adSet.name} under ${campaign.name}`);

    // 5. Creative Strategy Record Creation
    const record = await creativeStrategyService.createCreativeStrategy(
      {
        clientId: client._id.toString(),
        campaignId: campaign._id.toString(),
        adSetId: adSet._id.toString(),
        cycleNumber: 1,
        currentTestingCycle: 'Cycle 1',
        nextAssetDueDate: new Date(Date.now() + 86400000 * 3),
        creativePrepDue: new Date(Date.now() + 86400000 * 2),
        jointPrepDue: new Date(Date.now() + 86400000 * 4),
        atApprovalDue: new Date(Date.now() + 86400000 * 5),
        plannedLaunchDate: new Date(Date.now() + 86400000 * 6),
        assignedMediaBuyer: testMB._id.toString(),
        assignedCreativeStrategist: testCS._id.toString(),
        assignedGraphicDesigner: testGD._id.toString(),
        assignedTo: testMB._id.toString(),
        mediaBuyerRecommendation: 'Target broad with CBO $200/day',
        creativeStrategistRecommendation: 'Test 3 UGC hook angles',
        creativesProposed: '3 UGC videos',
        hypothesis: 'Fast-paced hook reduces CPA by 20%',
        abhishekDecision: 'APPROVED',
        finalAssetConfiguration: '9:16 Reels format',
        creativesReady: true,
        configurationReady: true
      },
      testAdmin
    );
    console.log(`✓ Creative Strategy record created for Cycle 1 (${record._id})`);

    // 6. Launch Creative -> Workflow timer begins
    const launchedRecord = await creativeStrategyService.launchCreative(
      record._id,
      { launchProof: 'https://business.facebook.com/ads/123' },
      testMB
    );
    if (launchedRecord.status !== 'LAUNCHED' || !launchedRecord.launchedAt) {
      throw new Error('Launch failed');
    }
    console.log(`✓ Creative launched at: ${launchedRecord.launchedAt}`);

    // 7. Verify 72-Hour Report Lock: Must REJECT immediate submission
    let rejected = false;
    try {
      await creativeStrategyService.submitReport(
        record._id,
        { reportNotes: 'Premature report attempt' },
        testMB
      );
    } catch (err) {
      rejected = true;
      console.log(`✓ 72-Hour Lock verified: Backend rejected premature report: "${err.message}"`);
    }
    if (!rejected) {
      throw new Error('Backend failed to enforce 72-hour report lock!');
    }

    // 8. Simulate 73 hours elapsed -> Report unlocks
    await CreativeStrategy.findByIdAndUpdate(record._id, {
      launchedAt: new Date(Date.now() - 73 * 3600 * 1000)
    });
    const reportRecord = await creativeStrategyService.submitReport(
      record._id,
      { reportNotes: 'ROAS 3.2x, Hook retention 45%' },
      testMB
    );
    if (reportRecord.status !== 'REPORT_SUBMITTED' || !reportRecord.reportSubmittedAt) {
      throw new Error('Report submission failed after 72 hours');
    }
    console.log(`✓ Performance report submitted after 72h lock passed. Status: ${reportRecord.status}`);

    // 9. Submit Learnings (Creative Strategist)
    const learningsRecord = await creativeStrategyService.submitLearnings(
      record._id,
      { learningsNotes: 'Problem-first hook outperformed solution hook by 60%' },
      testCS
    );
    if (learningsRecord.status !== 'LEARNINGS_SUBMITTED') {
      throw new Error('Learnings submission failed');
    }
    console.log(`✓ Learnings submitted. Status: ${learningsRecord.status}`);

    // 10. Create Brief (Graphic Designer)
    const briefRecord = await creativeStrategyService.createBrief(
      record._id,
      { briefContent: 'Brief for Iteration 2: Focus on problem statement hook' },
      testGD
    );
    if (briefRecord.status !== 'BRIEF_SUBMITTED') {
      throw new Error('Brief creation failed');
    }
    console.log(`✓ Brief created. Status: ${briefRecord.status}`);

    // 11. Approve Brief (Creative Strategist) -> Production begins
    const prodStartedRecord = await creativeStrategyService.approveBrief(record._id, testCS);
    if (prodStartedRecord.status !== 'PRODUCTION') {
      throw new Error('Brief approval failed');
    }
    console.log(`✓ Brief approved. Status: ${prodStartedRecord.status}`);

    // 12. Submit Production (Graphic Designer)
    const prodSubmittedRecord = await creativeStrategyService.submitCreativeProduction(
      record._id,
      { productionAssetsUrl: 'https://drive.google.com/assets/cycle1' },
      testGD
    );
    if (prodSubmittedRecord.status !== 'INTERNAL_REVIEW') {
      throw new Error('Production submission failed');
    }
    console.log(`✓ Creative submitted for internal review. Status: ${prodSubmittedRecord.status}`);

    // 13. Approve Internal Review (Creative Strategist) -> Moves to Client Review
    const clientReviewRecord = await creativeStrategyService.approveInternalReview(
      record._id,
      { reviewNotes: 'Ready for client presentation' },
      testCS
    );
    if (clientReviewRecord.status !== 'CLIENT_REVIEW') {
      throw new Error('Internal review approval failed');
    }
    console.log(`✓ Internal review approved. Status: ${clientReviewRecord.status}`);

    // 14. Client Review Decision: Approved
    const clientApprovedRecord = await creativeStrategyService.clientReviewDecision(
      record._id,
      { decision: 'APPROVED' },
      testAdmin
    );
    if (
      clientApprovedRecord.status !== 'CLIENT_APPROVED' ||
      !clientApprovedRecord.finalCreativesApproved
    ) {
      throw new Error('Client approval failed');
    }
    console.log(`✓ Client approved. Status: ${clientApprovedRecord.status}`);

    // 15. Handoff to Media Buyer
    const handoffRecord = await creativeStrategyService.handoffToMediaBuyer(record._id, testCS);
    if (handoffRecord.status !== 'HANDOFF') {
      throw new Error('Handoff failed');
    }
    console.log(`✓ Handed off to Media Buyer. Status: ${handoffRecord.status}`);

    // 16. Complete Cycle & Create Next Cycle
    const cycleResult = await creativeStrategyService.completeAndCreateNextCycle(record._id, testMB);
    if (cycleResult.completedRecord.status !== 'COMPLETED') {
      throw new Error('Current cycle was not marked COMPLETED');
    }
    if (
      cycleResult.nextRecord.status !== 'PENDING_LAUNCH' ||
      cycleResult.nextRecord.cycleNumber !== 2
    ) {
      throw new Error('Next cycle was not created in PENDING_LAUNCH or cycleNumber != 2');
    }
    console.log(
      `✓ Cycle 1 COMPLETED. Cycle 2 spawned in PENDING_LAUNCH state: ${cycleResult.nextRecord.currentTestingCycle}`
    );

    // 17. Timeline Audit Inspection
    const timelineEvents = await creativeStrategyService.getTimeline(record._id);
    console.log(`✓ Timeline events captured: ${timelineEvents.length} events`);
    for (const evt of timelineEvents) {
      console.log(
        `   • [${evt.timestamp.toISOString()}] ${evt.action} by ${evt.actorName} (${evt.actorRole}) - ${evt.notes || ''}`
      );
    }
    if (timelineEvents.length < 9) {
      throw new Error(`Expected at least 9 timeline events, got ${timelineEvents.length}`);
    }

    // 18. Admin Cascade Delete of Client
    console.log('Testing Admin Cascade Delete of Client...');
    const preview = await clientService.getClientDeletePreview(client._id);
    console.log(
      `✓ Delete Preview: ${preview.clientName} has ${preview.campaignsCount} campaigns, ${preview.adSetsCount} ad sets, ${preview.recordsCount} records`
    );

    const deleteResult = await clientService.deleteClient(client._id);
    console.log(`✓ Client deleted: ${deleteResult.clientName}`);

    // Verify cascade deletion
    const remainingClient = await Client.findById(client._id);
    const remainingCampaigns = await Campaign.find({ client: client._id });
    const remainingAdSets = await AdSet.find({ client: client._id });
    const remainingRecords = await CreativeStrategy.find({ client: client._id });
    const remainingTimelines = await CreativeStrategyTimeline.find({
      creativeStrategy: record._id
    });

    if (
      remainingClient ||
      remainingCampaigns.length > 0 ||
      remainingAdSets.length > 0 ||
      remainingRecords.length > 0 ||
      remainingTimelines.length > 0
    ) {
      throw new Error('Orphan records left behind after client deletion!');
    }
    console.log('✓ Cascade deletion verified: Zero orphan records remain in any collection.');

    // Cleanup test users
    await User.deleteMany({
      email: { $in: ['test_admin@test.com', 'test_mb@test.com', 'test_cs@test.com', 'test_gd@test.com'] }
    });
    console.log('✓ Cleaned up test users');

    console.log('=== ALL INTEGRATION TESTS PASSED PERFECTLY! ===');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runTests();
