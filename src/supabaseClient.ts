import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lexbxodlvcxhqgoenbcb.supabase.co'
const supabaseAnonKey = 'sb_publishable_EZL4Iycsgp6_tceB6jltlQ_qzUPBDD5'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)