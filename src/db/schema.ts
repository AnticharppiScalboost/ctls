import {
  pgTable,
  text,
  jsonb,
  doublePrecision,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const addresses = pgTable(
  'addresses',
  {
    // Identity
    nir: text('nir').primaryKey(),

    // Admin values (store as they come)
    department: text('department'),
    municipality: text('municipality'),

    // Address fields
    addressRaw: text('address_raw'),
    addressNorm: text('address_norm'),
    addressCanonical: text('address_canonical'),
    addressStruct: jsonb('address_struct'),

    viaCode: text('via_code'),
    viaLabel: text('via_label'),

    // Tokens (avoid reserved keyword "primary")
    primaryToken: text('primary_token'),
    secondaryToken: text('secondary_token'),
    tertiaryToken: text('tertiary_token'),

    // Numeric components for proximity search
    // Using double precision to allow encodings like 152.02 (for '152B')
    primaryNumber: doublePrecision('primary_number'),
    primarySuffix: text('primary_suffix'),
    secondaryNumber: doublePrecision('secondary_number'),
    secondarySuffix: text('secondary_suffix'),
    tertiaryNumber: doublePrecision('tertiary_number'),
    tertiarySuffix: text('tertiary_suffix'),

    quadrant: text('quadrant'),
    neighborhoodHint: text('neighborhood_hint'),

    // Areas / values / types
    privateAreaM2: doublePrecision('private_area_m2'),
    builtAreaM2: doublePrecision('built_area_m2'),
    // numeric for monetary values (precision/scale can be adjusted)
    deedValue: numeric('deed_value', { precision: 18, scale: 2 }),
    propertyType: text('property_type'),

    // Boundaries (linderos)
    boundariesJson: jsonb('boundaries_json'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    // Proximity indexes
    index('idx_addr_via_primary').on(t.viaCode, t.primaryNumber),
    index('idx_addr_via_secondary').on(t.viaCode, t.secondaryNumber),

    // Filtering helpers
    index('idx_addr_municipality').on(t.municipality),
    index('idx_addr_neighborhood').on(t.neighborhoodHint),

    // Optional: quick text filter on canonical form
    index('idx_addr_canonical').on(t.addressCanonical),
  ],
);

// Types for NestJS services/repositories
export type Address = InferSelectModel<typeof addresses>;
export type NewAddress = InferInsertModel<typeof addresses>;
