import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://heysxxdhwzegvizzfxfu.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhleXN4eGRod3plZ3ZpenpmeGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzMyOTUsImV4cCI6MjA5NzM0OTI5NX0.WoUMG3sEIN-Z8jzK_XfN38C49Qnm5SUAleNTPan7mL8'

export const supabase = createClient(supabaseUrl, supabaseKey)