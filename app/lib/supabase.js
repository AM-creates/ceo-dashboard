import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://heysxxdhwzegvizzfxfu.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_TRzpC12Owty3TU6DTMebAA_7tzeYOUV'

export const supabase = createClient(supabaseUrl, supabaseKey)