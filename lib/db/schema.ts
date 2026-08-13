import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {
  BathroomState,
  PassStatus,
  EventType,
  ActorType,
} from '@/lib/domain/types';

export const venues = pgTable(
  'venues',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    responseWindowSeconds: integer('response_window_seconds').default(300).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);

export const bathrooms = pgTable(
  'bathrooms',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    locationHint: text('location_hint'),
    state: text('state').$type<BathroomState>().default('open').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_bathrooms_venue_id').on(table.venueId),
  ]
);

export const passes = pgTable(
  'passes',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    bathroomId: text('bathroom_id')
      .notNull()
      .references(() => bathrooms.id, { onDelete: 'cascade' }),
    publicCode: text('public_code').notNull(),
    possessionTokenDigest: text('possession_token_digest').notNull(),
    status: text('status').$type<PassStatus>().notNull(),
    joinedAt: timestamp('joined_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    calledAt: timestamp('called_at', { mode: 'date', withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { mode: 'date', withTimezone: true }),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    index('idx_passes_possession_token_digest').on(table.possessionTokenDigest),
    index('idx_passes_venue_bathroom_status').on(
      table.venueId,
      table.bathroomId,
      table.status
    ),
    index('idx_passes_status_joined').on(table.status, table.joinedAt),
  ]
);

export const operators = pgTable(
  'operators',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    authSubject: text('auth_subject').notNull(), // e.g. username/email
    passwordHash: text('password_hash').notNull(),
    displayLabel: text('display_label').notNull(),
    role: text('role').default('operator').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('idx_operators_venue_auth_subject').on(
      table.venueId,
      table.authSubject
    ),
  ]
);

export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    bathroomId: text('bathroom_id')
      .notNull()
      .references(() => bathrooms.id, { onDelete: 'cascade' }),
    passId: text('pass_id').references(() => passes.id, { onDelete: 'set null' }),
    type: text('type').$type<EventType>().notNull(),
    actorType: text('actor_type').$type<ActorType>().notNull(),
    actorId: text('actor_id'),
    metadata: jsonb('metadata').default({}).notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_events_venue_occurred').on(table.venueId, table.occurredAt),
    index('idx_events_bathroom_occurred').on(table.bathroomId, table.occurredAt),
  ]
);
