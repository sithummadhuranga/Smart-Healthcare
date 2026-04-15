import { RtcRole, RtcTokenBuilder } from 'agora-access-token';

const TOKEN_TTL_SECONDS = 3600;

export interface AgoraTokenResult {
  token: string;
  channelName: string;
  uid: string;
  appId: string;
  expiresAt: number;
}

export function buildAgoraToken(appointmentId: string, userId: string): AgoraTokenResult {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new Error('AGORA_APP_ID and AGORA_APP_CERTIFICATE are required');
  }

  const channelName = appointmentId;
  const uid = userId;
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

  const token = RtcTokenBuilder.buildTokenWithAccount(
    appId,
    appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expiresAt
  );

  return {
    token,
    channelName,
    uid,
    appId,
    expiresAt,
  };
}
