import { getCoreDb, getPizzaDb, getTaxiDb } from "./supabase";

export type ProjectType = "pizza" | "taxi";

type TenantRow = {
    id: string;
    project_type: ProjectType;
    [key: string]: unknown;
};

type DataSourceRow = Record<string, unknown> | null;

export type PizzaTables = {
    orders: string;
    menuItems: string;
    streets: string;
};

export type TaxiTables = {
    rides: string;
    prices: string;
    calls: string;
};

type BaseProjectContext = {
    tenant: TenantRow;
    dataSource: DataSourceRow;
    db: ReturnType<typeof getCoreDb>;
};

type PizzaProjectContext = BaseProjectContext & {
    projectType: "pizza";
    tables: PizzaTables;
    realtimeTables: [string];
};

type TaxiProjectContext = BaseProjectContext & {
    projectType: "taxi";
    tables: TaxiTables;
    realtimeTables: [string, string];
};

const DEFAULT_TABLES = {
    pizza: {
        orders: "pizza_orders",
        menuItems: "menu_items",
        streets: "streets",
    },
    taxi: {
        rides: "taxi_rides",
        prices: "taxi_rate_cards",
        calls: "calls",
    },
} satisfies Record<ProjectType, PizzaTables | TaxiTables>;

const PREFIX_SUFFIXES = {
    pizza: {
        orders: "orders",
        menuItems: "menu_items",
        streets: "streets",
    },
    taxi: {
        rides: "rides",
        prices: "rate_cards",
        calls: "calls",
    },
} satisfies Record<ProjectType, Record<string, string>>;

function pickString(source: DataSourceRow, keys: string[]) {
    if (!source) return undefined;

    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }

    return undefined;
}

function buildPrefixedName(prefix: string | undefined, suffix: string, fallback: string) {
    if (!prefix) return fallback;
    return `${prefix}_${suffix}`;
}

function resolvePizzaTables(dataSource: DataSourceRow): PizzaTables {
    const defaults = DEFAULT_TABLES.pizza;
    const prefix = pickString(dataSource, ["table_prefix", "project_prefix", "table_namespace"]);

    return {
        orders: pickString(dataSource, ["orders_table", "pizza_orders_table"])
            || buildPrefixedName(prefix, PREFIX_SUFFIXES.pizza.orders, defaults.orders),
        menuItems: pickString(dataSource, ["menu_items_table", "pizza_menu_items_table"])
            || buildPrefixedName(prefix, PREFIX_SUFFIXES.pizza.menuItems, defaults.menuItems),
        streets: pickString(dataSource, ["streets_table", "pizza_streets_table"])
            || buildPrefixedName(prefix, PREFIX_SUFFIXES.pizza.streets, defaults.streets),
    };
}

function resolveTaxiTables(dataSource: DataSourceRow): TaxiTables {
    const defaults = DEFAULT_TABLES.taxi;
    const prefix = pickString(dataSource, ["table_prefix", "project_prefix", "table_namespace"]);

    return {
        rides: pickString(dataSource, ["rides_table", "taxi_rides_table"])
            || buildPrefixedName(prefix, PREFIX_SUFFIXES.taxi.rides, defaults.rides),
        prices: pickString(dataSource, ["prices_table", "rate_cards_table", "taxi_rate_cards_table"])
            || buildPrefixedName(prefix, PREFIX_SUFFIXES.taxi.prices, defaults.prices),
        calls: pickString(dataSource, ["calls_table", "taxi_calls_table"])
            || buildPrefixedName(prefix, PREFIX_SUFFIXES.taxi.calls, defaults.calls),
    };
}

export async function getProjectContext(tenantId: string, expectedType: "pizza"): Promise<PizzaProjectContext>;
export async function getProjectContext(tenantId: string, expectedType: "taxi"): Promise<TaxiProjectContext>;
export async function getProjectContext(tenantId: string, expectedType?: ProjectType): Promise<PizzaProjectContext | TaxiProjectContext>;
export async function getProjectContext(tenantId: string, expectedType?: ProjectType) {
    const coreDb = getCoreDb();

    const { data: tenant, error: tenantError } = await coreDb
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single<TenantRow>();

    if (tenantError || !tenant) {
        console.warn(`Tenant ${tenantId} not found, using default context.`);
        // Fallback to a dummy tenant object
        const dummyTenant: TenantRow = {
            id: tenantId,
            project_type: expectedType || "pizza",
        };
        
        const tables = expectedType === "taxi" 
            ? resolveTaxiTables(null) 
            : resolvePizzaTables(null);

        if (expectedType === "taxi") {
            const taxiTables = tables as TaxiTables;
            return {
                tenant: dummyTenant,
                dataSource: null,
                db: getTaxiDb(),
                projectType: "taxi",
                tables: taxiTables,
                realtimeTables: [taxiTables.rides, taxiTables.calls],
            };
        } else {
            const pizzaTables = tables as PizzaTables;
            return {
                tenant: dummyTenant,
                dataSource: null,
                db: getPizzaDb(),
                projectType: "pizza",
                tables: pizzaTables,
                realtimeTables: [pizzaTables.orders],
            };
        }
    }

    if (expectedType && tenant.project_type !== expectedType) {
        console.warn(`Tenant is not of expected type "${expectedType}".`);
    }

    const { data: dataSource, error: dataSourceError } = await coreDb
        .from("data_sources")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (dataSourceError) {
        console.warn(`Failed to load data source for tenant ${tenantId}:`, dataSourceError.message);
    }

    const db = tenant.project_type === "pizza" ? getPizzaDb() : getTaxiDb();

    if (tenant.project_type === "pizza") {
        const tables = resolvePizzaTables(dataSource ?? null);
        return {
            tenant,
            dataSource: dataSource ?? null,
            db,
            projectType: tenant.project_type,
            tables,
            realtimeTables: [tables.orders],
        };
    }

    const tables = resolveTaxiTables(dataSource ?? null);
    return {
        tenant,
        dataSource: dataSource ?? null,
        db,
        projectType: tenant.project_type,
        tables,
        realtimeTables: [tables.rides, tables.calls],
    };
}
