import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://heysxxdhwzegvizzfxfu.supabase.co'
const supabaseKey = 'sb_publishable_TRzpC12Owty3TU6DTMebAA_7tzeYOUV'

export const supabase = createClient(supabaseUrl, supabaseKey)