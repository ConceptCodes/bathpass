export type PassStatus = 'waiting' | 'called' | 'completed' | 'left' | 'skipped';

export type BathroomState = 'open' | 'closed';

export type EventType =
  | 'PASS_JOINED'
  | 'PASS_CALLED'
  | 'PASS_COMPLETED'
  | 'PASS_LEFT'
  | 'PASS_SKIPPED'
  | 'BATHROOM_OPENED'
  | 'BATHROOM_CLOSED';

export type ActorType = 'guest' | 'operator' | 'system';

export interface VenueDomain {
  id: string;
  slug: string;
  name: string;
  responseWindowSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BathroomDomain {
  id: string;
  venueId: string;
  name: string;
  locationHint: string | null;
  state: BathroomState;
  createdAt: Date;
  updatedAt: Date;
}

export interface PassDomain {
  id: string;
  venueId: string;
  bathroomId: string;
  publicCode: string;
  possessionTokenDigest: string;
  status: PassStatus;
  joinedAt: Date;
  calledAt: Date | null;
  resolvedAt: Date | null;
  version: number;
}

export interface OperatorDomain {
  id: string;
  venueId: string;
  authSubject: string;
  displayLabel: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventDomain {
  id: string;
  venueId: string;
  bathroomId: string;
  passId: string | null;
  type: EventType;
  actorType: ActorType;
  actorId: string | null;
  metadata: Record<string, unknown>;
  occurredAt: Date;
}

// Projection types for public API & guest client (never exposes token digest)
export interface PublicBathroomSummary {
  id: string;
  name: string;
  locationHint: string | null;
  state: BathroomState;
  waitingCount: number;
  estimatedWaitMinutes: number | null;
  calledPassPublicCode?: string | null;
}

export interface PublicVenueSummary {
  id: string;
  slug: string;
  name: string;
  responseWindowSeconds: number;
  bathrooms: PublicBathroomSummary[];
}

export interface PublicPassView {
  id: string;
  publicCode: string;
  bathroomId: string;
  bathroomName: string;
  status: PassStatus;
  queuePosition: number | null; // 1-indexed position in waiting line (null if called or terminal)
  waitingCount: number;
  joinedAt: Date;
  calledAt: Date | null;
  expiresAt: Date | null;
}

export interface OperatorDashboardView {
  venue: {
    id: string;
    name: string;
    slug: string;
    responseWindowSeconds: number;
  };
  bathrooms: {
    id: string;
    name: string;
    locationHint: string | null;
    state: BathroomState;
    calledPass: {
      id: string;
      publicCode: string;
      calledAt: Date;
      expiresAt: Date;
      isExpired: boolean;
    } | null;
    waitingCount: number;
    nextPass: {
      id: string;
      publicCode: string;
      joinedAt: Date;
    } | null;
    waitingPasses: {
      id: string;
      publicCode: string;
      joinedAt: Date;
      position: number;
    }[];
  }[];
  recentEvents: {
    id: string;
    bathroomId: string;
    bathroomName?: string;
    passId: string | null;
    type: EventType;
    actorType: ActorType;
    actorId: string | null;
    occurredAt: Date;
    metadata: Record<string, unknown>;
  }[];
}
