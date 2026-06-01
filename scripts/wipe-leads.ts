/**
 * Dev / QA only: delete all leads and reset batch import counters.
 * Deletes child rows in FK-safe order (call/whatsapp reference lead_feedback).
 * Run from backend: npm run db:wipe-leads
 * Requires: applied migrations for data_batches.imported_count (or updateMany may fail — use wipe_all_lead_data_mysql.sql).
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

async function main() {
  const prisma = new PrismaClient();
  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const c1 = await tx.callLog.deleteMany({});
      const c2 = await tx.whatsappInteraction.deleteMany({});
      const c3 = await tx.meeting.deleteMany({});
      const c4 = await tx.leadAssignment.deleteMany({});
      const c5 = await tx.leadAutoRetraction.deleteMany({});
      const c6 = await tx.leadFeedback.deleteMany({});
      const c7 = await tx.lead.deleteMany({});
      return { c1, c2, c3, c4, c5, c6, c7 };
    });
    console.log(
      `Deleted leads-related rows: call_logs=${deleted.c1.count}, whatsapp=${deleted.c2.count}, meetings=${deleted.c3.count}, assignments=${deleted.c4.count}, auto_retractions=${deleted.c5.count}, feedback=${deleted.c6.count}, leads=${deleted.c7.count}.`,
    );

    try {
      await prisma.dataBatch.updateMany({
        data: {
          importedCount: 0,
          skippedDuplicateCount: 0,
          failedImportCount: 0,
        },
      });
      console.log('Reset import stats on all data_batches.');
    } catch (e: unknown) {
      console.warn('Could not reset data_batches import columns (run SQL migration?):', e);
    }

    await prisma.leadUpload.updateMany({ data: { dataBatchId: null } });
    console.log('Detached lead_uploads from batches.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
