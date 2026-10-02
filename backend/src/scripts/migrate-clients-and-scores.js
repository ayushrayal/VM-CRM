import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Client } from '../models/Client.js';
import { CreativePerformance } from '../models/CreativePerformance.js';
import { CROExperiment } from '../models/CROExperiment.js';
import { calculateCreativeScore } from '../services/creativeScoring.service.js';
import { calculateCroScore } from '../services/croScoring.service.js';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI or MONGODB_URI not found in environment');
  process.exit(1);
}

export const runMigration = async () => {
  console.log('🔄 Starting Client and Performance Score Migration...\n');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // 1. Rollback Backup
  const backupDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const rawClients = await Client.find().lean();
  const rawCreatives = await CreativePerformance.find().lean();
  const rawCRO = await CROExperiment.find().lean();

  const backupData = {
    timestamp: new Date().toISOString(),
    clientsCount: rawClients.length,
    creativesCount: rawCreatives.length,
    croCount: rawCRO.length,
    clients: rawClients,
    creatives: rawCreatives,
    croExperiments: rawCRO
  };

  const backupPath = path.join(
    backupDir,
    `migration-backup-${Date.now()}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`📦 Backup safely saved to ${backupPath}`);
  console.log(`   - Clients: ${rawClients.length}`);
  console.log(`   - Creative Performances: ${rawCreatives.length}`);
  console.log(`   - CRO Experiments: ${rawCRO.length}\n`);

  // 2. Client Normalization and Duplicate Detection
  console.log('🔍 Checking existing Clients for duplicate normalized names...');
  const clientMap = new Map(); // normalizedName -> Client Doc
  const duplicateClients = [];

  for (const client of rawClients) {
    const rawName = client.clientName || client.name || '';
    const normalized = rawName.trim().toLowerCase();

    if (!normalized) continue;

    if (clientMap.has(normalized)) {
      duplicateClients.push({
        name: rawName,
        normalized,
        existingId: clientMap.get(normalized)._id,
        duplicateId: client._id
      });
      console.warn(`⚠️ Warning: Duplicate client found: "${rawName}" (${client._id}) conflicts with (${clientMap.get(normalized)._id})`);
    } else {
      // Ensure existing client has normalizedName, clientName, baselineROAS, currentROAS
      const updates = {};
      if (!client.clientName) updates.clientName = client.name;
      if (!client.normalizedName) updates.normalizedName = normalized;
      if (client.baselineROAS === undefined) updates.baselineROAS = 0;
      if (client.currentROAS === undefined) updates.currentROAS = client.baselineROAS || 0;

      if (Object.keys(updates).length > 0) {
        await Client.findByIdAndUpdate(client._id, { $set: updates });
      }

      const updatedDoc = await Client.findById(client._id);
      clientMap.set(normalized, updatedDoc);
    }
  }

  console.log(`   - Unique Clients registered: ${clientMap.size}`);
  console.log(`   - Duplicate Clients flagged: ${duplicateClients.length}\n`);

  // 3. Creative Performance Migration
  console.log('🎨 Migrating Creative Performance records...');
  let creativesMigrated = 0;
  for (const creative of await CreativePerformance.find()) {
    const rawClientName = (creative.clientName || '').trim();
    const normalized = rawClientName.toLowerCase();
    let clientDoc = normalized ? clientMap.get(normalized) : null;

    // If client does not exist, create client record safely
    if (!clientDoc && rawClientName) {
      console.log(`   + Registering missing client "${rawClientName}" for creative "${creative.adName}"`);
      clientDoc = await Client.create({
        name: rawClientName,
        clientName: rawClientName,
        normalizedName: normalized,
        baselineROAS: 0,
        currentROAS: 0,
        createdBy: creative.creatorId
      });
      clientMap.set(normalized, clientDoc);
    }

    const prevROAS = creative.previousROAS !== undefined && creative.previousROAS !== null
      ? creative.previousROAS
      : (clientDoc?.currentROAS ?? clientDoc?.baselineROAS ?? 0);

    // Recalculate score strictly using ROAS improvement
    const newScore = calculateCreativeScore({
      roas: creative.roas,
      previousROAS: prevROAS
    });

    creative.clientId = clientDoc ? clientDoc._id : creative.clientId;
    creative.clientName = clientDoc ? (clientDoc.clientName || clientDoc.name) : creative.clientName;
    creative.previousROAS = prevROAS;
    creative.score = newScore;
    creative.purchases = creative.purchases || 0;

    await creative.save();
    creativesMigrated++;
  }
  console.log(`✅ Creative Performance migrated: ${creativesMigrated} records updated.\n`);

  // 4. CRO Experiments Migration
  console.log('🧪 Migrating CRO Experiment records...');
  let croMigrated = 0;
  for (const exp of await CROExperiment.find()) {
    const rawClientName = (exp.clientName || '').trim();
    const normalized = rawClientName.toLowerCase();
    let clientDoc = normalized ? clientMap.get(normalized) : null;

    if (!clientDoc && rawClientName) {
      console.log(`   + Registering missing client "${rawClientName}" for experiment "${exp.hypothesisTitle}"`);
      clientDoc = await Client.create({
        name: rawClientName,
        clientName: rawClientName,
        normalizedName: normalized,
        baselineROAS: 0,
        currentROAS: 0,
        createdBy: exp.creatorId
      });
      clientMap.set(normalized, clientDoc);
    }

    // Recalculate simplified 1-point score
    const scoreResult = calculateCroScore(exp.results, exp.status);

    exp.clientId = clientDoc ? clientDoc._id : exp.clientId;
    exp.clientName = clientDoc ? (clientDoc.clientName || clientDoc.name) : exp.clientName;
    exp.score = {
      salesPoints: 0,
      prepaidPoints: 0,
      cancellationPoints: 0,
      totalPoints: scoreResult.totalPoints
    };
    exp.improvements = scoreResult.improvements;

    await exp.save();
    croMigrated++;
  }
  console.log(`✅ CRO Experiments migrated: ${croMigrated} records updated.\n`);

  console.log('🎉 Migration completed successfully!');
  await mongoose.disconnect();
};

if (process.argv[1] && process.argv[1].endsWith('migrate-clients-and-scores.js')) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
