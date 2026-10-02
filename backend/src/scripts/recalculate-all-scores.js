import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Client } from '../models/Client.js';
import { CreativePerformance } from '../models/CreativePerformance.js';
import { CROExperiment } from '../models/CROExperiment.js';
import { calculateCreativeScore } from '../services/creativeScoring.service.js';
import { calculateCroScore } from '../services/croScoring.service.js';

async function recalculateAllScores() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI not found in environment');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // 1. Process Clients: Ensure baselineROAS is set
  const clients = await Client.find({});
  console.log(`Found ${clients.length} clients`);
  for (const client of clients) {
    if (client.baselineROAS === undefined || client.baselineROAS === null) {
      client.baselineROAS = client.currentROAS ?? 0;
      await client.save();
    }
  }

  // 2. Process Creative Performance records
  const creatives = await CreativePerformance.find({}).sort({ createdAt: 1 });
  console.log(`Found ${creatives.length} creative performance records`);

  const clientLatestRoas = new Map();

  for (const creative of creatives) {
    let clientDoc = null;
    if (creative.clientId) {
      clientDoc = await Client.findById(creative.clientId);
    } else if (creative.clientName) {
      clientDoc = await Client.findOne({ normalizedName: creative.clientName.trim().toLowerCase() });
    }

    const baseline = clientDoc?.baselineROAS ?? creative.baselineROAS ?? creative.previousROAS ?? 0;
    creative.baselineROAS = baseline;
    creative.previousROAS = baseline;

    const newScore = calculateCreativeScore({
      roas: creative.roas,
      baselineROAS: baseline
    });

    creative.score = newScore;
    await creative.save();

    if (clientDoc) {
      clientLatestRoas.set(clientDoc._id.toString(), {
        clientDoc,
        roas: creative.roas
      });
    }
  }

  // Update client currentROAS to latest recorded creative performance
  for (const [, { clientDoc, roas }] of clientLatestRoas.entries()) {
    clientDoc.currentROAS = roas;
    await clientDoc.save();
  }

  // 3. Process CRO Experiments
  const experiments = await CROExperiment.find({});
  console.log(`Found ${experiments.length} CRO experiments`);

  for (const exp of experiments) {
    const scoreResult = calculateCroScore(exp.results || {}, exp.status);
    exp.score = {
      salesPoints: scoreResult.salesPoints,
      prepaidPoints: scoreResult.prepaidPoints,
      cancellationPoints: 0,
      totalPoints: scoreResult.totalPoints
    };
    exp.improvements = scoreResult.improvements;
    await exp.save();
  }

  console.log('Recalculation finished successfully.');
  await mongoose.disconnect();
}

recalculateAllScores().catch((err) => {
  console.error('Recalculation error:', err);
  process.exit(1);
});
