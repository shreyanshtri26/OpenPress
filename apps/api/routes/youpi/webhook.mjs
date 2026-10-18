// POST /youpi/webhook: payment confirmation from the YouPI PG gateway (https://github.com/gxurav1710/YouPI-PG).
// The gateway signs the raw request body with HMAC-SHA256 (header X-Gateway-Signature: sha256=<hex>) using
// YOUPI_WEBHOOK_SECRET. A confirmed support payment is stored in the supporters table; nothing else is trusted
// from the browser, which only shows a thank-you message.
import crypto from 'node:crypto';
import { PutCommand } from "../../db/commands.mjs";
import dynamoClient from '../../dynamoClient.mjs';

const TABLE = () => process.env.DYNAMO_SUPPORTERS_TABLE || 'op_supporters';

export function signatureValid(rawBody, header, secret) {
  if (!secret || !header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const handler = async (event) => {
  const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  // Must hash the exact bytes the gateway sent, so use the raw body untouched.
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '', 'utf8');
  if (!signatureValid(raw, headers['x-gateway-signature'], process.env.YOUPI_WEBHOOK_SECRET)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid webhook signature' }) };
  }

  const p = JSON.parse(raw.toString('utf8'));
  if (p.event === 'SUCCESS') {
    await dynamoClient.send(new PutCommand({
      TableName: TABLE(),
      Item: {
        supportId: String(p.paymentId || p.orderId),
        orderId: p.orderId, amount: p.amount, amountPaise: p.amountPaise, utr: p.utr,
        deliveryId: headers['x-gateway-delivery-id'] || null, createdAt: new Date().toISOString(),
      },
    }));
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
