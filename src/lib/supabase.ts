import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not found. Some features will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface SiteContent {
    id: string;
    couple_name: string;
    start_date: string;
    about_text: string;
    letter_text: string;
    hero_subtitle: string;
    hero_image_url: string;
    hero_image_position: number;
    updated_at: string;
}

export interface SliderImage {
    id: string;
    position: number;
    image_url: string;
    caption: string;
}

export interface GalleryImage {
    id: string;
    image_url: string;
    order: number;
}
