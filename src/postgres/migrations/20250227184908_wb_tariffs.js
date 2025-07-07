/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    const tableExists = await knex.schema.hasTable("wb_tariffs");
    
    if (!tableExists) {
        return knex.schema.createTable("wb_tariffs", (table) => {
            table.increments("id").primary();
            table.string("date").notNullable();
            table.string("warehouse_name").notNullable();
            table.decimal("pallet_delivery_expr", 10, 2).notNullable().defaultTo(0);
            table.decimal("pallet_delivery_value_base", 10, 2).notNullable().defaultTo(0);
            table.decimal("pallet_delivery_value_liter", 10, 2).notNullable().defaultTo(0);
            table.decimal("pallet_storage_expr", 10, 2).notNullable().defaultTo(0);
            table.decimal("pallet_storage_value_expr", 10, 2).notNullable().defaultTo(0);
            table.string("dt_next_pallet").nullable();
            table.string("dt_till_max").nullable();
            table.timestamps(true, true);
            
            // Create unique constraint on date and warehouse_name
            table.unique(["date", "warehouse_name"]);
            
            // Add indexes for better performance
            table.index("date");
            table.index("pallet_storage_value_expr");
        });
    } else {
        // Table exists, let's alter it to make sure it has the right schema
        return knex.schema.alterTable("wb_tariffs", (table) => {
            // Make sure these columns are nullable
            table.string("dt_next_pallet").nullable().alter();
            table.string("dt_till_max").nullable().alter();
            
            // Ensure decimal types are correct
            table.decimal("pallet_delivery_expr", 10, 2).notNullable().defaultTo(0).alter();
            table.decimal("pallet_delivery_value_base", 10, 2).notNullable().defaultTo(0).alter();
            table.decimal("pallet_delivery_value_liter", 10, 2).notNullable().defaultTo(0).alter();
            table.decimal("pallet_storage_expr", 10, 2).notNullable().defaultTo(0).alter();
            table.decimal("pallet_storage_value_expr", 10, 2).notNullable().defaultTo(0).alter();
        });
    }
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    return knex.schema.dropTableIfExists("wb_tariffs");
}