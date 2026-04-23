import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://keqkejjjyovqhuaclbjz.supabase.co'
const supabaseKey = 'sb_publishable_LiCoEY23eH2xuno3A-40Gg_sbnNeeCx'

export const supabase = createClient(supabaseUrl, supabaseKey)