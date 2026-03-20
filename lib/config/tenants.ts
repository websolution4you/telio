export const TEST_TENANTS = {
    // Z pizza tenantu v zadaní (Pizza Levoča)
    PIZZA: '3e803e21-3177-42ed-974c-a1a1b260b88b',
    // Taxi Košice
    TAXI: '6076dbf2-8f14-432d-b27d-504ae30b94b2',
};

/**
 * Získa ID aktuálne prihláseného tenanta podľa požadovaného módu.
 * 
 * @todo: Neskôr sa toto nahradí volaním do Supabase Auth session, napr.:
 * const { data: { user } } = await supabase.auth.getUser();
 * const { data: profile } = await supabase.from('tenant_users').select('tenant_id').eq('user_id', user.id).single();
 * return profile.tenant_id;
 */
export async function getCurrentTenantId(projectType: 'pizza' | 'taxi') {
    return projectType === 'pizza' ? TEST_TENANTS.PIZZA : TEST_TENANTS.TAXI;
}
