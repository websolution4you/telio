export const TEST_TENANTS = {
    // Z pizza tenantu v zadaní
    PIZZA: 'ac3b439d-a446-4d67-abf7-5e04f58647fe',
    // Vymyslené ID pre zatiaľ nenapojený Taxi tenant
    TAXI: 'taxi-placeholder-tenant-id-0000',
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
