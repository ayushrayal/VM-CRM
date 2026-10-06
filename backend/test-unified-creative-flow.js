import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { User } from './src/models/User.js';
import { Client } from './src/models/Client.js';
import { Campaign } from './src/models/Campaign.js';
import { AdSet } from './src/models/AdSet.js';
import { CreativeStrategy } from './src/models/CreativeStrategy.js';
import { CreativeStrategyTimeline } from './src/models/CreativeStrategyTimeline.js';
import * as creativeStrategyService from './src/services/creativeStrategy.service.js';
import { WORKFLOW_STATUS } from './src/constants/creativeWorkflow.js';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dotenv.config();

const runUnifiedFlowTests = async () => {
  console.log('====================================================');
  console.log('UNIFIED CREATIVE STRATEGY CREATION & REPORT TESTS');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  let testAdmin, testMB, testClient;
  const createdRecordIds = [];
  const createdCampaignIds = [];
  const createdAdSetIds = [];

  try {
    // Setup test users
    testAdmin = await User.findOne({ email: 'unified_test_admin@test.com' });
    if (!testAdmin) {
      testAdmin = await User.create({
        name: 'Unified Test Admin',
        email: 'unified_test_admin@test.com',
        password: 'Password123!',
        role: 'admin',
        teamRole: 'none',
        status: 'active'
      });
    }

    testMB = await User.findOne({ email: 'unified_test_mb@test.com' });
    if (!testMB) {
      testMB = await User.create({
        name: 'Unified Test Media Buyer',
        email: 'unified_test_mb@test.com',
        password: 'Password123!',
        role: 'team',
        teamRole: 'media_buyer',
        status: 'active'
      });
    }

    testClient = await Client.create({
      name: `UnifiedTestClient_${Date.now()}`,
      code: 'UTC',
      status: 'active',
      createdBy: testAdmin._id
    });
    console.log(`✓ Test Client created: ${testClient.name}`);

    // ====================================================
    // TEST 1: Existing Campaign + Existing Ad Set + New Creative -> Only Creative created
    // ====================================================
    console.log('\n--- TEST 1: Existing Campaign + Existing Ad Set + New Creative ---');
    const existingCamp1 = await Campaign.create({
      name: 'Existing Campaign 1',
      client: testClient._id,
      campaignType: 'CBO',
      budget: 10000,
      objective: 'Sales',
      createdBy: testAdmin._id
    });
    createdCampaignIds.push(existingCamp1._id);

    const existingAdSet1 = await AdSet.create({
      name: 'Existing Ad Set 1',
      campaign: existingCamp1._id,
      client: testClient._id,
      targeting: 'Broad',
      createdBy: testAdmin._id
    });
    createdAdSetIds.push(existingAdSet1._id);

    const initialCampCount1 = await Campaign.countDocuments({ client: testClient._id });
    const initialAdSetCount1 = await AdSet.countDocuments({ campaign: existingCamp1._id });

    const result1 = await creativeStrategyService.unifiedCreateCreativeStrategy(
      {
        clientId: testClient._id.toString(),
        isNewCampaign: false,
        campaignId: existingCamp1._id.toString(),
        isNewAdSet: false,
        adSetId: existingAdSet1._id.toString(),
        creativeData: {
          adName: 'Creative Under Existing Both',
          adType: 'Static',
          testingStyle: 'New Angle',
          creatives: [{ url: 'https://ik.imagekit.io/test/sample1.png', name: 'img1.png' }]
        }
      },
      testAdmin
    );
    createdRecordIds.push(result1._id);

    const finalCampCount1 = await Campaign.countDocuments({ client: testClient._id });
    const finalAdSetCount1 = await AdSet.countDocuments({ campaign: existingCamp1._id });

    if (finalCampCount1 !== initialCampCount1 || finalAdSetCount1 !== initialAdSetCount1) {
      throw new Error('Test 1 Failed: New campaign or adset was created instead of reusing existing!');
    }
    if (result1.campaign._id.toString() !== existingCamp1._id.toString()) {
      throw new Error('Test 1 Failed: Creative campaign reference does not match existing campaign!');
    }
    if (result1.adSet._id.toString() !== existingAdSet1._id.toString()) {
      throw new Error('Test 1 Failed: Creative adSet reference does not match existing adSet!');
    }
    console.log('✓ TEST 1 PASSED: Only Creative created under existing Campaign and Ad Set.');

    // ====================================================
    // TEST 2: Existing Campaign + New Ad Set + New Creative -> Ad Set + Creative created
    // ====================================================
    console.log('\n--- TEST 2: Existing Campaign + New Ad Set + New Creative ---');
    const initialCampCount2 = await Campaign.countDocuments({ client: testClient._id });
    const initialAdSetCount2 = await AdSet.countDocuments({ campaign: existingCamp1._id });

    const result2 = await creativeStrategyService.unifiedCreateCreativeStrategy(
      {
        clientId: testClient._id.toString(),
        isNewCampaign: false,
        campaignId: existingCamp1._id.toString(),
        isNewAdSet: true,
        adSetData: {
          name: 'Newly Created Ad Set Under Existing Camp',
          targeting: 'Broad',
          ageGroup: { start: 20, end: 55 },
          gender: 'Female',
          includedLocations: ['Mumbai', 'Delhi']
        },
        creativeData: {
          adName: 'Creative Under Existing Camp + New AdSet',
          adType: 'Video',
          testingStyle: 'Iteration #1'
        }
      },
      testAdmin
    );
    createdRecordIds.push(result2._id);
    createdAdSetIds.push(result2.adSet._id);

    const finalCampCount2 = await Campaign.countDocuments({ client: testClient._id });
    const finalAdSetCount2 = await AdSet.countDocuments({ campaign: existingCamp1._id });

    if (finalCampCount2 !== initialCampCount2) {
      throw new Error('Test 2 Failed: Campaign was duplicate created!');
    }
    if (finalAdSetCount2 !== initialAdSetCount2 + 1) {
      throw new Error('Test 2 Failed: Ad Set was not created!');
    }
    console.log('✓ TEST 2 PASSED: Ad Set + Creative created under existing Campaign.');

    // ====================================================
    // TEST 3: New Campaign + New Ad Set + New Creative -> All 3 created
    // ====================================================
    console.log('\n--- TEST 3: New Campaign + New Ad Set + New Creative ---');
    const result3 = await creativeStrategyService.unifiedCreateCreativeStrategy(
      {
        clientId: testClient._id.toString(),
        isNewCampaign: true,
        campaignData: {
          name: 'Brand New All-in-One Campaign',
          campaignType: 'CBO',
          budget: 15000,
          objective: 'Sales'
        },
        isNewAdSet: true,
        adSetData: {
          name: 'Brand New All-in-One Ad Set',
          targeting: 'Broad',
          gender: 'Both'
        },
        creativeData: {
          adName: 'Brand New All-in-One Creative',
          adType: 'Carousel',
          testingStyle: 'Variation #1'
        }
      },
      testAdmin
    );
    createdRecordIds.push(result3._id);
    createdCampaignIds.push(result3.campaign._id);
    createdAdSetIds.push(result3.adSet._id);

    if (!result3.campaign || !result3.adSet) {
      throw new Error('Test 3 Failed: Campaign or Ad Set missing from result!');
    }
    console.log('✓ TEST 3 PASSED: Campaign, Ad Set, and Creative created together atomically.');

    // ====================================================
    // TEST 4: CBO budget behavior
    // ====================================================
    console.log('\n--- TEST 4: CBO budget behavior ---');
    try {
      await creativeStrategyService.unifiedCreateCreativeStrategy(
        {
          clientId: testClient._id.toString(),
          isNewCampaign: true,
          campaignData: {
            name: 'Invalid CBO Campaign No Budget',
            campaignType: 'CBO'
            // Missing budget
          },
          isNewAdSet: true,
          adSetData: { name: 'AdSet 4', targeting: 'Broad' },
          creativeData: { adName: 'Ad 4', adType: 'Static' }
        },
        testAdmin
      );
      throw new Error('Expected failure for CBO without budget');
    } catch (err) {
      if (err.message.includes('Campaign Budget is required')) {
        console.log('✓ TEST 4 PASSED: Missing Campaign Budget on CBO correctly rejected.');
      } else {
        throw err;
      }
    }

    // ====================================================
    // TEST 5: ABO budget behavior
    // ====================================================
    console.log('\n--- TEST 5: ABO budget behavior ---');
    try {
      await creativeStrategyService.unifiedCreateCreativeStrategy(
        {
          clientId: testClient._id.toString(),
          isNewCampaign: true,
          campaignData: {
            name: 'ABO Campaign Without Ad Set Budget',
            campaignType: 'ABO'
          },
          isNewAdSet: true,
          adSetData: {
            name: 'AdSet 5 No Budget',
            targeting: 'Broad'
            // Missing Ad Set budget for ABO
          },
          creativeData: { adName: 'Ad 5', adType: 'Static' }
        },
        testAdmin
      );
      throw new Error('Expected failure for ABO without Ad Set budget');
    } catch (err) {
      if (err.message.includes('Ad Set Budget is required')) {
        console.log('✓ TEST 5 PASSED: Missing Ad Set Budget on ABO correctly rejected.');
      } else {
        throw err;
      }
    }

    // ====================================================
    // TEST 6 & 7: Broad vs Interest targeting
    // ====================================================
    console.log('\n--- TEST 6 & 7: Targeting Validation ---');
    // Broad succeeds without interests
    const broadResult = await creativeStrategyService.unifiedCreateCreativeStrategy(
      {
        clientId: testClient._id.toString(),
        isNewCampaign: false,
        campaignId: existingCamp1._id.toString(),
        isNewAdSet: true,
        adSetData: {
          name: 'Broad Ad Set No Interests',
          targeting: 'Broad'
        },
        creativeData: { adName: 'Broad Ad', adType: 'Static' }
      },
      testAdmin
    );
    createdRecordIds.push(broadResult._id);
    createdAdSetIds.push(broadResult.adSet._id);
    console.log('✓ TEST 6 PASSED: Targeting = Broad succeeds without interests.');

    // Interest fails without interests
    try {
      await creativeStrategyService.unifiedCreateCreativeStrategy(
        {
          clientId: testClient._id.toString(),
          isNewCampaign: false,
          campaignId: existingCamp1._id.toString(),
          isNewAdSet: true,
          adSetData: {
            name: 'Interest Ad Set Empty Interests',
            targeting: 'Interest',
            interests: []
          },
          creativeData: { adName: 'Interest Ad', adType: 'Static' }
        },
        testAdmin
      );
      throw new Error('Expected failure for Interest targeting with empty interests');
    } catch (err) {
      if (err.message.includes('At least one interest must be specified')) {
        console.log('✓ TEST 7 PASSED: Targeting = Interest requires at least one interest.');
      } else {
        throw err;
      }
    }

    // ====================================================
    // TEST 8: Campaign mismatch clears/rejects Ad Set
    // ====================================================
    console.log('\n--- TEST 8: Cross-Campaign Ad Set rejection ---');
    const otherCamp = await Campaign.create({
      name: 'Other Campaign For Mismatch Test',
      client: testClient._id,
      campaignType: 'CBO',
      budget: 5000,
      createdBy: testAdmin._id
    });
    createdCampaignIds.push(otherCamp._id);

    try {
      await creativeStrategyService.unifiedCreateCreativeStrategy(
        {
          clientId: testClient._id.toString(),
          isNewCampaign: false,
          campaignId: otherCamp._id.toString(),
          isNewAdSet: false,
          adSetId: existingAdSet1._id.toString(), // belongs to existingCamp1, not otherCamp!
          creativeData: { adName: 'Mismatch Ad', adType: 'Static' }
        },
        testAdmin
      );
      throw new Error('Expected failure when attaching Ad Set from Campaign A to Campaign B');
    } catch (err) {
      if (err.message.includes('Selected Ad Set does not belong to the chosen Campaign')) {
        console.log('✓ TEST 8 PASSED: Attaching Ad Set to wrong Campaign strictly blocked.');
      } else {
        throw err;
      }
    }

    // ====================================================
    // TEST 10: Maximum 20 creative uploads
    // ====================================================
    console.log('\n--- TEST 10: Maximum 20 uploads limit ---');
    const twentyOneCreatives = Array.from({ length: 21 }, (_, i) => ({
      url: `https://test.com/img${i}.png`,
      name: `img${i}.png`
    }));

    try {
      await creativeStrategyService.unifiedCreateCreativeStrategy(
        {
          clientId: testClient._id.toString(),
          isNewCampaign: false,
          campaignId: existingCamp1._id.toString(),
          isNewAdSet: false,
          adSetId: existingAdSet1._id.toString(),
          creativeData: {
            adName: 'Too Many Uploads Creative',
            adType: 'Static',
            creatives: twentyOneCreatives
          }
        },
        testAdmin
      );
      throw new Error('Expected failure for > 20 creatives');
    } catch (err) {
      if (err.message.includes('Maximum 20 creative uploads allowed')) {
        console.log('✓ TEST 10 PASSED: Uploads strictly capped at maximum 20 files.');
      } else {
        throw err;
      }
    }

    // ====================================================
    // TEST 11 to 17: Observation Periods & Scheduling Calculations
    // ====================================================
    console.log('\n--- TEST 11-17: Scheduling & Lock Enforcement ---');
    const now = new Date();

    // 13. 72-hour calculation
    const rec72 = await creativeStrategyService.unifiedCreateCreativeStrategy(
      {
        clientId: testClient._id.toString(),
        isNewCampaign: false,
        campaignId: existingCamp1._id.toString(),
        isNewAdSet: false,
        adSetId: existingAdSet1._id.toString(),
        creativeData: {
          adName: '72h Creative',
          adType: 'Static',
          launchDate: now.toISOString(),
          observationDurationHours: 72,
          schedulingMode: 'DURATION',
          assignedMediaBuyer: testMB._id.toString(),
          creatives: [
            { fileId: 'f1', name: 'Creative A', url: 'https://test.com/a.png' },
            { fileId: 'f2', name: 'Creative B', url: 'https://test.com/b.png' }
          ]
        }
      },
      testAdmin
    );
    createdRecordIds.push(rec72._id);

    const diff72Hours = (rec72.reportDueAt.getTime() - rec72.launchDate.getTime()) / (3600 * 1000);
    if (Math.round(diff72Hours) !== 72) {
      throw new Error(`Test 13 Failed: Expected 72 hours, got ${diff72Hours}`);
    }
    console.log('✓ TEST 13 PASSED: 72-hour observation calculation accurate.');

    // 14. 48-hour calculation
    const rec48 = await creativeStrategyService.unifiedCreateCreativeStrategy(
      {
        clientId: testClient._id.toString(),
        isNewCampaign: false,
        campaignId: existingCamp1._id.toString(),
        isNewAdSet: false,
        adSetId: existingAdSet1._id.toString(),
        creativeData: {
          adName: '48h Creative',
          adType: 'Static',
          launchDate: now.toISOString(),
          observationDurationHours: 48,
          schedulingMode: 'DURATION'
        }
      },
      testAdmin
    );
    createdRecordIds.push(rec48._id);
    const diff48Hours = (rec48.reportDueAt.getTime() - rec48.launchDate.getTime()) / (3600 * 1000);
    if (Math.round(diff48Hours) !== 48) {
      throw new Error(`Test 14 Failed: Expected 48 hours, got ${diff48Hours}`);
    }
    console.log('✓ TEST 14 PASSED: 48-hour observation calculation accurate.');

    // 15. 24-hour calculation
    const rec24 = await creativeStrategyService.unifiedCreateCreativeStrategy(
      {
        clientId: testClient._id.toString(),
        isNewCampaign: false,
        campaignId: existingCamp1._id.toString(),
        isNewAdSet: false,
        adSetId: existingAdSet1._id.toString(),
        creativeData: {
          adName: '24h Creative',
          adType: 'Static',
          launchDate: now.toISOString(),
          observationDurationHours: 24,
          schedulingMode: 'DURATION'
        }
      },
      testAdmin
    );
    createdRecordIds.push(rec24._id);
    const diff24Hours = (rec24.reportDueAt.getTime() - rec24.launchDate.getTime()) / (3600 * 1000);
    if (Math.round(diff24Hours) !== 24) {
      throw new Error(`Test 15 Failed: Expected 24 hours, got ${diff24Hours}`);
    }
    console.log('✓ TEST 15 PASSED: 24-hour observation calculation accurate.');

    // 16. Custom duration calculation (e.g. 36 hours)
    const rec36 = await creativeStrategyService.unifiedCreateCreativeStrategy(
      {
        clientId: testClient._id.toString(),
        isNewCampaign: false,
        campaignId: existingCamp1._id.toString(),
        isNewAdSet: false,
        adSetId: existingAdSet1._id.toString(),
        creativeData: {
          adName: '36h Custom Creative',
          adType: 'Static',
          launchDate: now.toISOString(),
          observationDurationHours: 36,
          schedulingMode: 'DURATION'
        }
      },
      testAdmin
    );
    createdRecordIds.push(rec36._id);
    const diff36Hours = (rec36.reportDueAt.getTime() - rec36.launchDate.getTime()) / (3600 * 1000);
    if (Math.round(diff36Hours) !== 36) {
      throw new Error(`Test 16 Failed: Expected 36 hours, got ${diff36Hours}`);
    }
    console.log('✓ TEST 16 PASSED: Custom duration (36h) calculation accurate.');

    // 17. Custom due date/time
    const customDue = new Date(Date.now() + 5 * 24 * 3600 * 1000);
    const recCustomDue = await creativeStrategyService.unifiedCreateCreativeStrategy(
      {
        clientId: testClient._id.toString(),
        isNewCampaign: false,
        campaignId: existingCamp1._id.toString(),
        isNewAdSet: false,
        adSetId: existingAdSet1._id.toString(),
        creativeData: {
          adName: 'Custom Due Date Creative',
          adType: 'Static',
          launchDate: now.toISOString(),
          schedulingMode: 'CUSTOM_DUE_DATE',
          reportDueAt: customDue.toISOString()
        }
      },
      testAdmin
    );
    createdRecordIds.push(recCustomDue._id);
    if (recCustomDue.reportDueAt.getTime() !== customDue.getTime()) {
      throw new Error('Test 17 Failed: Custom due date was not preserved exactly!');
    }
    console.log('✓ TEST 17 PASSED: Custom due date/time accurate.');

    // Launch rec72
    await creativeStrategyService.launchCreative(rec72._id, { launchProof: 'https://fb.com/proof' }, testMB);

    // 11. Performance report cannot unlock before configured observation period
    try {
      await creativeStrategyService.submitReport(
        rec72._id,
        {
          selectedCreatives: ['f1'],
          creativePerformances: [
            {
              creativeId: 'f1',
              creativeName: 'Creative A',
              spend: 5000,
              costPerResult: 250,
              purchases: 20,
              purchaseConversionValue: 50000,
              roas: 10,
              performanceStatus: 'WINNER'
            }
          ]
        },
        testMB
      );
      throw new Error('Expected report lock error before 72 hours');
    } catch (err) {
      if (err.message.includes('Performance report is locked')) {
        console.log('✓ TEST 11 PASSED: Report submission blocked before observation period concludes.');
      } else {
        throw err;
      }
    }

    // 12, 18, 19, 20: Performance Report after observation period with multiple creatives & independent metrics
    console.log('\n--- TEST 12, 18, 19, 20: Performance Report Multiple Creatives & Winner/Loser ---');
    // Simulate observation period completion
    await CreativeStrategy.findByIdAndUpdate(rec72._id, {
      launchedAt: new Date(Date.now() - 75 * 3600 * 1000),
      reportDueAt: new Date(Date.now() - 3 * 3600 * 1000)
    });

    const reportPayload = {
      selectedCreatives: ['f1', 'f2'],
      creativePerformances: [
        {
          creativeId: 'f1',
          creativeName: 'Creative A',
          spend: 5000,
          costPerResult: 250,
          purchases: 20,
          purchaseConversionValue: 50000,
          roas: 10,
          performanceStatus: 'WINNER'
        },
        {
          creativeId: 'f2',
          creativeName: 'Creative B',
          spend: 5000,
          costPerResult: 450,
          purchases: 8,
          purchaseConversionValue: 20000,
          roas: 4,
          performanceStatus: 'LOSER'
        }
      ],
      performanceNotes: 'Creative A is high-performing winner, Creative B fatigued',
      additionalObservations: 'Desktop performed better than Mobile'
    };

    const reportedRec = await creativeStrategyService.submitReport(rec72._id, reportPayload, testMB);

    // 12. Unlocked report submission succeeded
    if (reportedRec.status !== WORKFLOW_STATUS.REPORT_SUBMITTED) {
      throw new Error(`Test 12 Failed: Expected status REPORT_SUBMITTED, got ${reportedRec.status}`);
    }
    console.log('✓ TEST 12 PASSED: Report successfully submitted after observation period.');

    // 18. Multiple creatives selected
    if (reportedRec.selectedCreatives.length !== 2) {
      throw new Error('Test 18 Failed: Selected creatives array length mismatch!');
    }
    console.log('✓ TEST 18 PASSED: Multiple creatives selected and persisted.');

    // 19. Each selected creative stores independent performance metrics
    const perfA = reportedRec.creativePerformances.find((c) => c.creativeId === 'f1');
    const perfB = reportedRec.creativePerformances.find((c) => c.creativeId === 'f2');
    if (!perfA || !perfB) {
      throw new Error('Test 19 Failed: Missing creative performances for A or B!');
    }
    if (perfA.spend !== 5000 || perfA.purchases !== 20 || perfA.roas !== 10) {
      throw new Error('Test 19 Failed: Creative A metrics corrupted!');
    }
    if (perfB.spend !== 5000 || perfB.purchases !== 8 || perfB.roas !== 4) {
      throw new Error('Test 19 Failed: Creative B metrics corrupted!');
    }
    console.log('✓ TEST 19 PASSED: Independent performance metrics persisted per creative.');

    // 20. Winner/Loser status persists
    if (perfA.performanceStatus !== 'WINNER' || perfB.performanceStatus !== 'LOSER') {
      throw new Error('Test 20 Failed: Winner / Loser status not preserved correctly!');
    }
    console.log('✓ TEST 20 PASSED: Creative A correctly marked WINNER, Creative B correctly marked LOSER.');

    // 21. Cycle association remains correct
    if (reportedRec.cycleNumber !== 1 || reportedRec.currentTestingCycle !== 'Cycle 1') {
      throw new Error('Test 21 Failed: Cycle association was lost or corrupted!');
    }
    console.log('✓ TEST 21 PASSED: Cycle association verified for Cycle 1.');

    // ====================================================
    // TEST 25: Rollback safety on failed creation
    // ====================================================
    console.log('\n--- TEST 25: Transaction / Rollback safety on failure ---');
    const initialCampTotal = await Campaign.countDocuments();
    const initialAdSetTotal = await AdSet.countDocuments();
    const initialRecordTotal = await CreativeStrategy.countDocuments();

    try {
      await creativeStrategyService.unifiedCreateCreativeStrategy(
        {
          clientId: testClient._id.toString(),
          isNewCampaign: true,
          campaignData: {
            name: 'Rollback Candidate Campaign',
            campaignType: 'CBO',
            budget: 10000,
            objective: 'Sales'
          },
          isNewAdSet: true,
          adSetData: {
            name: 'Rollback Candidate Ad Set',
            targeting: 'Broad'
          },
          creativeData: {
            adName: '', // Invalid empty Ad Name to cause failure at step 3!
            adType: 'Static'
          }
        },
        testAdmin
      );
      throw new Error('Expected failure due to empty Ad Name');
    } catch (err) {
      if (err.message.includes('Ad Name is required')) {
        const afterCampTotal = await Campaign.countDocuments();
        const afterAdSetTotal = await AdSet.countDocuments();
        const afterRecordTotal = await CreativeStrategy.countDocuments();

        if (
          afterCampTotal !== initialCampTotal ||
          afterAdSetTotal !== initialAdSetTotal ||
          afterRecordTotal !== initialRecordTotal
        ) {
          throw new Error(
            `Test 25 Failed: Orphan records left behind! Camps: ${afterCampTotal - initialCampTotal}, AdSets: ${afterAdSetTotal - initialAdSetTotal}, Records: ${afterRecordTotal - initialRecordTotal}`
          );
        }
        console.log('✓ TEST 25 PASSED: Rollback triggered successfully. Zero orphan records left behind.');
      } else {
        throw err;
      }
    }

    console.log('\n====================================================');
    console.log('🎉 ALL UNIFIED CREATIVE STRATEGY CREATION & REPORT TESTS PASSED!');
    console.log('====================================================');
  } finally {
    // Cleanup
    if (createdRecordIds.length > 0) {
      await CreativeStrategyTimeline.deleteMany({ creativeStrategy: { $in: createdRecordIds } });
      await CreativeStrategy.deleteMany({ _id: { $in: createdRecordIds } });
    }
    if (createdAdSetIds.length > 0) {
      await AdSet.deleteMany({ _id: { $in: createdAdSetIds } });
    }
    if (createdCampaignIds.length > 0) {
      await Campaign.deleteMany({ _id: { $in: createdCampaignIds } });
    }
    if (testClient?._id) {
      await Client.findByIdAndDelete(testClient._id);
    }
    if (testAdmin?._id) {
      await User.findByIdAndDelete(testAdmin._id);
    }
    if (testMB?._id) {
      await User.findByIdAndDelete(testMB._id);
    }
    await mongoose.disconnect();
  }
};

runUnifiedFlowTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
