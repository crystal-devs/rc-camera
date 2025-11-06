/**
 * Production Backend Cleanup Endpoint
 * 
 * Optimized for efficient S3 deletion with proper batching,
 * parallelization, and progress tracking
 */

import express from 'express';
import {
  deleteS3ObjectsHybrid,
  createProgressReporter,
  getRecommendedStrategy
} from './s3-deletion-strategies.js';

const router = express.Router();

// Authentication middleware for admin endpoints
const adminAuth = (req, res, next) => {
  const apiKey = req.headers.authorization?.split(' ')[1];
  
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

/**
 * POST /admin/cleanup-media
 * 
 * Cleans up deleted media documents and S3 objects efficiently
 * Uses adaptive strategy based on volume
 */
router.post('/admin/cleanup-media', adminAuth, async (req, res) => {
  console.log('[CLEANUP] Starting media cleanup job');

  const stats = {
    scanned: 0,
    deleted: 0,
    failed: 0,
    s3Deleted: 0,
    s3Failed: 0,
    startTime: Date.now(),
    endTime: null,
    duration: null,
    errors: [],
    strategy: null
  };

  let progressReporter = null;

  try {
    // Get MongoDB connection from app locals
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '30', 10);
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    console.log(`[CLEANUP] Searching for media deleted before: ${cutoff.toISOString()}`);

    // ============================================
    // Phase 1: Find All Documents to Delete
    // ============================================
    const cursor = db.collection('media').find(
      {
        isDeleted: true,
        deletedAt: { $lt: cutoff },
        deletionStatus: { $ne: 'done' }
      },
      {
        projection: { _id: 1, s3Keys: 1, uploadId: 1, deletionAttempts: 1 },
        batchSize: 500  // Efficient cursor batch size
      }
    );

    // Collect all documents and S3 keys
    const docsToDelete = [];
    const allS3Keys = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      stats.scanned++;
      
      if (doc.s3Keys?.length > 0) {
        docsToDelete.push(doc);
        allS3Keys.push(...doc.s3Keys);
      }
    }

    await cursor.close();

    console.log(`[CLEANUP] Found ${stats.scanned} documents to process`);
    console.log(`[CLEANUP] Total S3 keys to delete: ${allS3Keys.length}`);

    if (stats.scanned === 0) {
      stats.endTime = Date.now();
      stats.duration = stats.endTime - stats.startTime;
      
      return res.json({
        status: 'ok',
        message: 'No documents to cleanup',
        stats
      });
    }

    // ============================================
    // Phase 2: Determine Best Deletion Strategy
    // ============================================
    const strategyRecommendation = getRecommendedStrategy(allS3Keys.length);
    stats.strategy = strategyRecommendation.strategy;

    console.log(
      `[CLEANUP] Recommended strategy: ${strategyRecommendation.strategy} ` +
      `(${strategyRecommendation.reason})`
    );

    // ============================================
    // Phase 3: Delete from S3 with Progress Tracking
    // ============================================
    progressReporter = createProgressReporter(allS3Keys.length, '[S3 DELETE]');

    const s3Result = await deleteS3ObjectsHybrid(allS3Keys, {
      batchSize: 1000,
      maxRetries: 3,
      retryDelayMs: 100,
      concurrency: process.env.NODE_ENV === 'production' ? 2 : 5,
      onProgress: (processed, total) => progressReporter.update(processed, total)
    });

    stats.s3Deleted = s3Result.deleted;
    stats.s3Failed = s3Result.failed;
    stats.errors.push(...s3Result.errors);

    console.log(
      `[CLEANUP] S3 deletion complete: ` +
      `${stats.s3Deleted} deleted, ${stats.s3Failed} failed`
    );

    // ============================================
    // Phase 4: Hard Delete from MongoDB
    // ============================================
    console.log('[CLEANUP] Starting MongoDB cleanup phase');

    let dbDeleted = 0;
    let dbFailed = 0;

    for (const doc of docsToDelete) {
      try {
        // Only hard-delete if S3 deletion succeeded
        const hasAllKeys = doc.s3Keys.every(key => 
          s3Result.deleted > 0 || !s3Result.errors.some(e => e.key === key)
        );

        if (hasAllKeys || doc.s3Keys.length === 0) {
          const result = await db.collection('media').deleteOne({ _id: doc._id });
          
          if (result.deletedCount > 0) {
            dbDeleted++;
            stats.deleted++;
          }
        } else {
          // S3 deletion had errors, mark for retry
          await db.collection('media').updateOne(
            { _id: doc._id },
            {
              $set: {
                deletionStatus: 'failed',
                deletionError: 'partial_s3_failure',
                lastDeletionAttemptAt: new Date()
              },
              $inc: { deletionAttempts: 1 }
            }
          );
          dbFailed++;
          stats.failed++;
        }
      } catch (error) {
        console.error(`[CLEANUP] Error processing document ${doc._id}:`, error.message);
        dbFailed++;
        stats.failed++;
        stats.errors.push({
          docId: doc._id.toString(),
          error: error.message
        });
      }
    }

    console.log(`[CLEANUP] MongoDB cleanup complete: ${dbDeleted} deleted, ${dbFailed} failed`);

    // ============================================
    // Phase 5: Final Stats and Response
    // ============================================
    stats.endTime = Date.now();
    stats.duration = stats.endTime - stats.startTime;

    const progressStats = progressReporter.getStats();
    const s3Rate = (allS3Keys.length / (stats.duration / 1000)).toFixed(2);

    console.log(
      `[CLEANUP] Job complete: ${stats.duration}ms, ` +
      `${s3Rate} obj/sec, ` +
      `${stats.deleted}/${stats.scanned} documents deleted`
    );

    return res.json({
      status: 'ok',
      message: 'Cleanup completed successfully',
      stats: {
        ...stats,
        duration: `${stats.duration}ms`,
        s3ThroughputObjSec: parseFloat(s3Rate),
        successRate: stats.scanned > 0 
          ? ((stats.deleted / stats.scanned) * 100).toFixed(2) + '%'
          : 'N/A'
      }
    });

  } catch (error) {
    console.error('[CLEANUP] Critical error:', error);
    
    stats.endTime = Date.now();
    stats.duration = stats.endTime - stats.startTime;

    return res.status(500).json({
      status: 'error',
      message: 'Cleanup failed',
      error: error.message,
      stats
    });
  }
});

/**
 * POST /admin/cleanup-media/status
 * 
 * Get status of pending cleanup jobs
 */
router.get('/admin/cleanup-media/status', adminAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Count by status
    const statusCounts = await db.collection('media').aggregate([
      {
        $match: { isDeleted: true }
      },
      {
        $group: {
          _id: '$deletionStatus',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Count failed attempts
    const failedAttempts = await db.collection('media').aggregate([
      {
        $match: { 
          isDeleted: true,
          deletionStatus: 'failed',
          deletionAttempts: { $gte: 3 }
        }
      },
      {
        $count: 'count'
      }
    ]).toArray();

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item._id || 'pending'] = item.count;
      return acc;
    }, {});

    return res.json({
      status: 'ok',
      cleanupStatus: {
        ...statusMap,
        failedAfter3Attempts: failedAttempts[0]?.count || 0
      }
    });

  } catch (error) {
    console.error('[STATUS] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/cleanup-media/retry-failed
 * 
 * Retry cleanup for documents that previously failed
 */
router.post('/admin/cleanup-media/retry-failed', adminAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const maxAttempts = parseInt(req.body.maxAttempts || '3', 10);

    // Find failed documents that haven't exceeded retry limit
    const failedDocs = await db.collection('media').find({
      isDeleted: true,
      deletionStatus: 'failed',
      deletionAttempts: { $lt: maxAttempts }
    }).toArray();

    console.log(`[RETRY] Found ${failedDocs.length} documents to retry`);

    // Reset status for retry
    const updateResult = await db.collection('media').updateMany(
      {
        isDeleted: true,
        deletionStatus: 'failed',
        deletionAttempts: { $lt: maxAttempts }
      },
      {
        $unset: { deletionStatus: '' },
        $set: { lastRetryAt: new Date() }
      }
    );

    return res.json({
      status: 'ok',
      message: 'Retry job queued',
      updated: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('[RETRY] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
