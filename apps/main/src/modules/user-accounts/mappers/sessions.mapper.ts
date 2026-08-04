import type { Session } from '../../../generated/prisma/client.js';
import { SessionView } from '../api/view-types/sessions/session-view.type.js';

export const mapSessionToView = (session: Session): SessionView => ({
  ip: session.ip,
  title: session.deviceName,
  lastActiveDate: session.issuedAt.toISOString(),
  deviceId: session.id,
});

export const mapSessionsToView = (sessions: Session[]): SessionView[] =>
  sessions.map(mapSessionToView);
