/**
 * LIGHTWEIGHT Lambda Function
 * 
 * This Lambda function acts as a scheduler/orchestrator only.
 * It calls your backend API which handles the actual cleanup logic.
 * 
 * This way:
 * - Your backend owns the business logic (single source of truth)
 * - Lambda is just a thin trigger
 * - You reuse your existing MongoDB connections from backend
 * - Much simpler to maintain
 */

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const BACKEND_URL = process.env.BACKEND_URL;
  const API_KEY = process.env.API_KEY;

  if (!BACKEND_URL || !API_KEY) {
    throw new Error('Missing BACKEND_URL or API_KEY environment variables');
  }

  console.log('Triggering backend cleanup endpoint');

  try {
    // Call your backend cleanup endpoint
    const response = await fetch(`${BACKEND_URL}/admin/cleanup-media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Lambda-Request': 'true' // Optional: identify Lambda requests
      },
      timeout: 840000 // 14 minutes (Lambda timeout is 15 min)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log('Backend cleanup response:', JSON.stringify(data));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Cleanup completed',
        backendResponse: data
      })
    };

  } catch (error) {
    console.error('Cleanup failed:', {
      message: error.message,
      code: error.code,
      status: error.status
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Cleanup failed',
        error: error.message
      })
    };
  }
};
