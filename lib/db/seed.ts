import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { appConfig } from '@/lib/config';

export async function seedDatabase(dbInstance = getDb()) {
  console.log('Seeding database from bathpass.config.json...');

  // 1. Create or update Venue
  const existingVenues = await dbInstance
    .select()
    .from(schema.venues)
    .where(eq(schema.venues.id, appConfig.venue.id));

  if (existingVenues.length === 0) {
    await dbInstance.insert(schema.venues).values({
      id: appConfig.venue.id,
      slug: appConfig.venue.slug,
      name: appConfig.venue.name,
      responseWindowSeconds: appConfig.venue.responseWindowSeconds,
    });
  }

  // 2. Create or update Bathrooms
  for (const b of appConfig.bathrooms) {
    const existing = await dbInstance
      .select()
      .from(schema.bathrooms)
      .where(eq(schema.bathrooms.id, b.id));

    if (existing.length === 0) {
      await dbInstance.insert(schema.bathrooms).values({
        id: b.id,
        venueId: appConfig.venue.id,
        name: b.name,
        locationHint: b.locationHint || null,
        state: b.state,
      });
    }
  }

  // 3. Create or update Default Operator
  const existingOps = await dbInstance
    .select()
    .from(schema.operators)
    .where(eq(schema.operators.id, appConfig.defaultOperator.id));

  if (existingOps.length === 0) {
    const passwordHash = await bcrypt.hash('bathpass2026', 10);
    await dbInstance.insert(schema.operators).values({
      id: appConfig.defaultOperator.id,
      venueId: appConfig.venue.id,
      authSubject: appConfig.defaultOperator.authSubject,
      passwordHash,
      displayLabel: appConfig.defaultOperator.displayLabel,
      role: appConfig.defaultOperator.role,
      isActive: true,
    });
  }

  console.log('Seeding complete!');
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
