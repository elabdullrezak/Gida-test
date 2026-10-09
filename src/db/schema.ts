import { pgTable, uuid, text, integer, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barcode: text("barcode").unique(),
    name: text("name").notNull(),
    brand: text("brand"),
    imageUrl: text("image_url"),
    quantity: text("quantity"),
    categories: text("categories"),
    ingredientsText: text("ingredients_text"),
    ingredients: jsonb("ingredients").$type<{ name: string; risk: string }[]>().default([]),
    additives: jsonb("additives")
      .$type<{ code: string; name: string; risk: string }[]>()
      .default([]),
    nutriments: jsonb("nutriments")
      .$type<Record<string, number | null>>()
      .default({}),
    nutritionTabs: jsonb("nutrition_tabs")
      .$type<{ title: string; values: { title: string; value: number; unit: string }[] }[]>()
      .default([]),
    allergens: jsonb("allergens").$type<string[]>().default([]),
    manufacturer: text("manufacturer"),
    nutriscore: text("nutriscore"),
    nova: integer("nova"),
    score: integer("score").notNull().default(50),
    scoreLabel: text("score_label"),
    notes: jsonb("notes")
      .$type<{ title: string; description: string; severity: string; icon: string; source?: string | null; url?: string | null }[]>()
      .default([]),
    source: text("source").default("local"),
    scanCount: integer("scan_count").default(1),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("products_barcode_idx").on(t.barcode), index("products_name_idx").on(t.name)]
);

export const scans = pgTable("scans", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  barcode: text("barcode"),
  productName: text("product_name"),
  score: integer("score"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  barcode: text("barcode").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productLists = pgTable("product_lists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("bookmark"),
  kind: text("kind").notNull().default("custom"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const listEntries = pgTable("list_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: text("list_id").notNull().references(() => productLists.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [uniqueIndex("list_entries_list_product_idx").on(t.listId, t.productId)]);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
