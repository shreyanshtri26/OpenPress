import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { GetCommand, UpdateCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";
import { ensureTableName, TABLE_NAME } from "./shared.mjs";
import { clientConfig } from "../../lib/storage.mjs";

const emailClient = new SESClient(clientConfig());

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const handler = async (event) => {
  try {
    const {
      emails,
      surveyUrl,
      surveyTitle,
      surveyId,
      subject: customSubject,
      emailSubject,
      body: customBody,
      emailBody,
    } = JSON.parse(event.body || "{}");

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Emails list is required" }),
      };
    }
    if (!surveyUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Survey URL is required" }),
      };
    }

    // Deduplicate emails to ensure we don't send multiple invitations to the same person
    const uniqueEmails = [...new Set(emails.map((e) => String(e || "").trim().toLowerCase()))].filter(Boolean);
    if (uniqueEmails.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No valid email addresses provided" }),
      };
    }

    const sender = process.env.EMAIL_SENDER;
    const finalSubject = (customSubject || emailSubject || "").trim() ||
      `Invitation to participate in survey: ${surveyTitle || "New Survey"}`;
    const providedBody = (customBody || emailBody || "").trim();

    const bodyContentHtml = providedBody
      ? providedBody
          .split(/\n\s*\n/)
          .map((para) => `<p style="margin-bottom: 16px;">${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
          .join("")
      : `
        <p>You have been invited to participate in the survey: <strong>${escapeHtml(surveyTitle || "OpenPress Survey")}</strong>.</p>
        <p>Your feedback is highly valued. Please click the button below to fill out the survey:</p>
      `;

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const trimmedEmail of uniqueEmails) {

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.6;
              color: #1a202c;
              margin: 0;
              padding: 0;
              background-color: #f7fafc;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              padding: 32px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              background-color: #ffffff;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .header {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 24px;
              color: #1a202c;
              border-bottom: 2px solid #1a202c;
              padding-bottom: 12px;
            }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              font-weight: 600;
              border-radius: 4px;
              margin: 24px 0;
              text-align: center;
            }
            .footer {
              font-size: 12px;
              color: #718096;
              margin-top: 32px;
              border-top: 1px solid #e2e8f0;
              padding-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">Survey Invitation</div>
            ${bodyContentHtml}
            <div>
              <a href="${surveyUrl}" class="btn" target="_blank">Start Survey</a>
            </div>
            <p>If the button above does not work, you can copy and paste the link below into your browser:</p>
            <p style="word-break: break-all;"><a href="${surveyUrl}">${surveyUrl}</a></p>
            <div class="footer">
              This email was sent from an automated address. Please do not reply directly.
            </div>
          </div>
        </body>
        </html>
      `;

      const textBody = providedBody
        ? `${providedBody}\n\nClick the link below to respond:\n${surveyUrl}\n\nThank you!`
        : `You have been invited to participate in the survey: ${surveyTitle || "OpenPress Survey"}.\n\nClick the link below to respond:\n${surveyUrl}\n\nThank you!`;

      try {
        await emailClient.send(
          new SendEmailCommand({
            Source: sender,
            Destination: {
              ToAddresses: [trimmedEmail],
            },
            Message: {
              Subject: {
                Data: finalSubject,
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
        sent++;
      } catch (err) {
        console.error(`Failed to send email to ${trimmedEmail}:`, err);
        failed++;
        errors.push({ email: trimmedEmail, error: err.message });
      }
    }

    // Persist invited emails list onto the survey record if surveyId is provided and TABLE_NAME is configured
    if (surveyId && TABLE_NAME && sent > 0) {
      try {
        const surveyResult = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: { surveyId },
          })
        );
        const existingSurvey = surveyResult.Item;
        if (existingSurvey) {
          const existingInvited = Array.isArray(existingSurvey.invitedEmails)
            ? existingSurvey.invitedEmails
            : [];
          const updatedInvitedEmails = [
            ...new Set([
              ...existingInvited.map((e) => String(e || "").trim().toLowerCase()),
              ...uniqueEmails,
            ]),
          ].filter(Boolean);

          await docClient.send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { surveyId },
              UpdateExpression: "SET invitedEmails = :invited, updatedAt = :now",
              ExpressionAttributeValues: {
                ":invited": updatedInvitedEmails,
                ":now": new Date().toISOString(),
              },
            })
          );
        }
      } catch (dbErr) {
        console.warn("Could not persist invited emails to survey item:", dbErr);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Invitations processed: ${sent} sent, ${failed} failed.`,
        sent,
        failed,
        errors,
      }),
    };
  } catch (error) {
    console.error("Send survey invites error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message,
      }),
    };
  }
};
