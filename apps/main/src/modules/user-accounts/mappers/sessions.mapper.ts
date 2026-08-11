import type { Session } from '../../../generated/prisma/client.js';
import { SessionView } from '../api/view-types/sessions/session-view.type.js';

export class SessionMapper {
  static toSession(session: Session): SessionView {
    return {
      ip: session.ip,
      title: session.deviceName,
      lastActiveDate: session.issuedAt.toISOString(),
      deviceId: session.id,
    };
  }

  static toSessions(sessions: Session[]): SessionView[] {
    return sessions.map((session) => this.toSession(session));
  }
}
