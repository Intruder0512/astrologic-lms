// Microsoft Teams integration via Microsoft Graph API (client credentials /
// app-only auth flow - no per-instructor login required).
//
// PREREQUISITES (do this in Azure AD before it will work):
// 1. Register an app in Azure AD (portal.azure.com -> App registrations).
// 2. Add application permission: OnlineMeetings.ReadWrite.All, grant admin consent.
// 3. Create a client secret.
// 4. IMPORTANT: application access to Teams online meetings additionally
//    requires a Teams application access policy, granted via PowerShell:
//      New-CsApplicationAccessPolicy -Identity <policy-name> -AppIds <client-id>
//      Grant-CsApplicationAccessPolicy -PolicyName <policy-name> -Identity <organizer-upn>
//    This must be run per-instructor (organizer) who will have meetings
//    created on their behalf. Without this step, Graph will return 403 even
//    with the right API permissions.
//
// Set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET in .env. Not set = this
// service throws a clear 503 error when actually used, but does NOT crash
// the app on boot (same lazy pattern as Razorpay in paymentController.js).

const TENANT_ID = () => process.env.MS_TENANT_ID;
const CLIENT_ID = () => process.env.MS_CLIENT_ID;
const CLIENT_SECRET = () => process.env.MS_CLIENT_SECRET;

const isConfigured = () => !!(TENANT_ID() && CLIENT_ID() && CLIENT_SECRET());

let cachedToken = null;
let tokenExpiresAt = 0;

const getAccessToken = async () => {
  if (!isConfigured()) {
    const err = new Error(
      'Microsoft Teams integration is not configured - set MS_TENANT_ID, MS_CLIENT_ID and MS_CLIENT_SECRET'
    );
    err.statusCode = 503;
    throw err;
  }

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) return cachedToken;

  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID()}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Microsoft token request failed: ${data.error_description || data.error || res.statusText}`);
  }

  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  return cachedToken;
};

/**
 * Create a Teams online meeting on behalf of an organizer (instructor).
 * @param {Object} params
 * @param {string} params.organizerUpn - instructor's Microsoft 365 UPN/email
 * @param {string} params.subject
 * @param {Date|string} params.startDateTime
 * @param {Date|string} params.endDateTime
 */
const createTeamsMeeting = async ({ organizerUpn, subject, startDateTime, endDateTime }) => {
  const token = await getAccessToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerUpn)}/onlineMeetings`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to create Teams meeting: ${data.error?.message || res.statusText}`);
  }

  return { meetingId: data.id, joinUrl: data.joinWebUrl };
};

/**
 * Update an existing Teams meeting's time/subject.
 */
const updateTeamsMeeting = async ({ organizerUpn, meetingId, subject, startDateTime, endDateTime }) => {
  const token = await getAccessToken();

  const body = {};
  if (subject) body.subject = subject;
  if (startDateTime) body.startDateTime = new Date(startDateTime).toISOString();
  if (endDateTime) body.endDateTime = new Date(endDateTime).toISOString();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerUpn)}/onlineMeetings/${meetingId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Failed to update Teams meeting: ${data.error?.message || res.statusText}`);
  }
};

/**
 * Delete/cancel a Teams meeting.
 */
const cancelTeamsMeeting = async ({ organizerUpn, meetingId }) => {
  const token = await getAccessToken();
  await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerUpn)}/onlineMeetings/${meetingId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
};

module.exports = { isConfigured, createTeamsMeeting, updateTeamsMeeting, cancelTeamsMeeting };
