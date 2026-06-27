const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;

if (accountSid && authToken) {
  try {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS Service initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Twilio client:', err.message);
  }
} else {
  console.warn('⚠️ Twilio credentials missing in environment. Running in SIMULATION mode.');
}

/**
 * Sends an SMS to a customer phone number.
 * If Twilio is not initialized, it falls back to a simulated console print.
 * @param {string} to - Customer phone number
 * @param {string} body - SMS message body
 * @returns {Promise<boolean>}
 */
const sendSMS = async (to, body) => {
  if (!to) {
    console.error('[SMS Service] Cannot send SMS: Recipient phone number is empty.');
    return false;
  }

  // Clean the phone number (strip whitespace, hyphens, etc. except + prefix)
  const formattedTo = to.replace(/[^\d+]/g, '');

  if (client && twilioPhoneNumber) {
    try {
      console.log(`[Twilio SMS] Dispatching real SMS via Twilio to ${formattedTo}...`);
      const response = await client.messages.create({
        body,
        from: twilioPhoneNumber,
        to: formattedTo
      });
      console.log(`[Twilio SMS] Real SMS sent successfully. Message SID: ${response.sid}`);
      return true;
    } catch (err) {
      console.error(`[Twilio SMS] Failed to send real SMS via Twilio to ${formattedTo}:`, err.message);
      // Fall back to console simulation on API failure so workflow doesn't break
      console.log(`[Simulated SMS Fallback] To: ${to}\n[Message]: "${body}"`);
      return false;
    }
  } else {
    // Simulated Mode
    console.log(`===================================`);
    console.log(`[Simulated SMS Outbox] To: ${to}`);
    console.log(`[Simulated SMS Message]: "${body}"`);
    console.log(`===================================`);
    return true;
  }
};

module.exports = {
  sendSMS
};
