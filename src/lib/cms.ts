import { supabase, SiteContent, SliderImage, GalleryImage } from './supabase';

export async function getSiteContent(): Promise<SiteContent | null> {
    const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .single();

    if (error) {
        console.error('Error fetching site content:', error);
        return null;
    }

    return data;
}

export async function getSliderImages(): Promise<SliderImage[]> {
    const { data, error } = await supabase
        .from('slider_images')
        .select('*')
        .order('position', { ascending: true });

    if (error) {
        console.error('Error fetching slider images:', error);
        return [];
    }

    return data || [];
}

export async function getGalleryImages(): Promise<GalleryImage[]> {
    const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .order('order', { ascending: true });

    if (error) {
        console.error('Error fetching gallery images:', error);
        return [];
    }

    return data || [];
}

export async function updateSiteContent(content: Partial<SiteContent>): Promise<boolean> {
    const { id, ...updates } = content;
    const { error } = await supabase
        .from('site_content')
        .update(updates)
        .eq('id', id!);

    if (error) {
        console.error('Error updating site content:', JSON.stringify(error, null, 2));
        return false;
    }

    return true;
}

export async function uploadImage(file: File, bucket: string, path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (error) {
        console.error('Error uploading image:', error);
        return null;
    }

    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
}
