import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch complete user profile from public.users table (synced via trigger)
    const { data: profile, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    if (dbError || !profile) {
        // Return basic user info if profile isn't fully synced yet
        return NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || '',
            role: 'user'
        })
    }

    return NextResponse.json(profile)
}
