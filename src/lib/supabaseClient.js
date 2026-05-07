import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://axbyohgbgjirlnnmcugi.supabase.co";
const supabaseAnonKey = "sb_publishable_pKBQ-eYVLbltV22hgo2tzQ_TFfH5EXh";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);