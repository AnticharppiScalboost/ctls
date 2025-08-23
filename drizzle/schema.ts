import { pgTable, index, text, doublePrecision, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const addresses = pgTable("addresses", {
	id: text().primaryKey().notNull(),
	nir: text(),
	department: text(),
	municipality: text(),
	addressRaw: text("address_raw"),
	addressNorm: text("address_norm"),
	addressCanonical: text("address_canonical"),
	addressStruct: text("address_struct"),
	viaCode: text("via_code"),
	viaLabel: text("via_label"),
	primaryField: text("primary_field"),
	secondaryField: text("secondary_field"),
	tertiary: text(),
	quadrant: text(),
	primaryNumber: doublePrecision("primary_number"),
	secondaryNumber: doublePrecision("secondary_number"),
	tertiaryNumber: doublePrecision("tertiary_number"),
	units: text(),
	areaPrivM2: doublePrecision("area_priv_m2"),
	areaConstM2: doublePrecision("area_const_m2"),
	transactionValue: doublePrecision("transaction_value"),
	typeField: text("type_field"),
	linderosJson: text("linderos_json"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	neighborhood: text(),
}, (table) => [
	index("idx_addresses_department").using("btree", table.department.asc().nullsLast().op("text_ops")),
	index("idx_addresses_municipality").using("btree", table.municipality.asc().nullsLast().op("text_ops")),
	index("idx_addresses_nir").using("btree", table.nir.asc().nullsLast().op("text_ops")),
	index("idx_addresses_quadrant").using("btree", table.quadrant.asc().nullsLast().op("text_ops")),
	index("idx_addresses_via_primary").using("btree", table.viaCode.asc().nullsLast().op("text_ops"), table.primaryNumber.asc().nullsLast().op("text_ops")),
	index("idx_addresses_via_secondary").using("btree", table.viaCode.asc().nullsLast().op("float8_ops"), table.secondaryNumber.asc().nullsLast().op("float8_ops")),
]);
