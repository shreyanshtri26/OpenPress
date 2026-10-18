import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { isEnabled } from "../../lib/features.mjs";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";
import { randomUUID } from "crypto";

const TABLE_NAME = process.env.DYNAMO_CONTACT_US_TABLE || "op_contact_submissions";
const sesClient = new SESClient({});

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

async function sendContactEmail(item) {
  const sender = process.env.SES_SENDER_EMAIL;
  const receiver = String(item.receiverEmail || "").trim();

  if (!sender) {
    throw new Error("SES_SENDER_EMAIL is not configured");
  }
  if (!isValidEmail(receiver)) {
    throw new Error("A valid receiverEmail is required");
  }

  const htmlBody = `
    <table cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;font-family:Arial,sans-serif;width:100%;">
      <tbody><tr>
        <td>
          <table cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:40px;border:1px solid #e8e8e8;width:100%;max-width:720px;margin:0 auto;">
            <tbody><tr>
              <td style="padding-bottom:30px;border-bottom:1px solid #eeeeee;">
                <h1 style="margin:0;font-size:30px;color:#111111;">Contact Form Submission</h1>
                <p style="margin-top:12px;color:#777777;font-size:15px;line-height:1.6;">A new message has been submitted through your website contact form.</p>
              </td>
            </tr>
            <tr><td style="height:24px;"></td></tr>
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0" style="width:100%;">
                  <tbody><tr>
                    <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;"><span style="font-weight:700;color:#111111;">First Name:</span> <span style="color:#555555;">${escapeHtml(item.firstName)}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;"><span style="font-weight:700;color:#111111;">Last Name:</span> <span style="color:#555555;">${escapeHtml(item.lastName)}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;"><span style="font-weight:700;color:#111111;">Phone Number:</span> <span style="color:#555555;">${escapeHtml(item.phoneNumber)}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;"><span style="font-weight:700;color:#111111;">Email:</span> <span style="color:#555555;">${escapeHtml(item.email)}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;"><span style="font-weight:700;color:#111111;">Topic:</span> <span style="color:#555555;">${escapeHtml(item.topic)}</span></td>
                  </tr>
                  <tr>
                    <td style="padding-top:25px;">
                      <div style="font-size:18px;font-weight:700;margin-bottom:15px;color:#111111;">Message</div>
                      <div style="background:#fafafa;border-left:5px solid #111111;padding:24px;border-radius:10px;color:#444444;line-height:1.8;font-size:15px;">${escapeHtml(item.message).replace(/\n/g, "<br/>")}</div>
                    </td>
                  </tr>
                </tbody></table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:40px;">
                <p style="margin:0;color:#999999;font-size:12px;line-height:1.6;">This email was generated automatically from your website contact form.</p>
              </td>
            </tr>
          </tbody></table>
        </td>
      </tr></tbody>
    </table>
  `;

  const textBody = `Contact Form Submission\n\nFirst Name: ${item.firstName}\nLast Name: ${item.lastName}\nPhone Number: ${item.phoneNumber || ""}\nEmail: ${item.email}\nTopic: ${item.topic}\n\nMessage:\n${item.message}`;

  await sesClient.send(
    new SendEmailCommand({
      Source: sender,
      Destination: {
        ToAddresses: [receiver],
      },
      ReplyToAddresses: isValidEmail(item.email) ? [item.email] : undefined,
      Message: {
        Subject: {
          Data: "OpenPress Enquiry",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
          Text: {
            Data: textBody,
            Charset: "UTF-8",
          },
        },
      },
    })
  );
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { firstName, lastName, phoneNumber, email, topic, message } = body;
    const receiverEmail = String(body.receiverEmail || "").trim();

    // Basic server-side validation
    if (!firstName || !lastName || !email || !message) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "Missing required fields",
          required: ["firstName", "lastName", "email", "message"]
        })
      };
    }
    if (!isValidEmail(email)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "A valid email is required" })
      };
    }
    if (!isValidEmail(receiverEmail)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "A valid receiverEmail is required" })
      };
    }

    const submissionId = randomUUID();
    const timestamp = new Date().toISOString();

    const item = {
      submissionId,
      firstName,
      lastName,
      phoneNumber,
      email,
      topic: topic || 'feedback',
      message,
      receiverEmail,
      createdAt: timestamp,
      status: 'new' // Can be used for internal tracking
    };

    console.log(`📝 Saving contact submission ${submissionId} to ${TABLE_NAME}`);

    await dynamoClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    if (!isEnabled('email')) {
      console.log(`📭 Email is turned off; submission ${submissionId} saved without sending`);
    } else try {
      console.log(`📧 Sending contact submission ${submissionId} to ${receiverEmail}`);
      await sendContactEmail(item);
    } catch (emailError) {
      console.error("❌ Failed to send contact submission email:", emailError);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Submission was saved, but email delivery failed",
          error: emailError.message,
          submissionId
        })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: "Your message has been received. Thank you!", 
        submissionId 
      })
    };
  } catch (error) {
    console.error("❌ Error saving form submission:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: "Failed to save submission", 
        error: error.message 
      })
    };
  }
};
