import { getSupabaseClient } from '@/template';
import { STORAGE_BUCKET } from '@/constants/config';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export async function pickImage(): Promise<{ uri: string; base64: string } | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1, // We compress manually below
    base64: false, // We get base64 after compression
    allowsEditing: true,
    aspect: [4, 3],
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  // Compress image: resize to max 1080px wide, 75% quality
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return { uri: manipulated.uri, base64: manipulated.base64 ?? '' };
  } catch {
    // Fallback: re-pick with base64 if manipulator fails
    const fallback = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (fallback.canceled || !fallback.assets[0]) return null;
    return { uri: fallback.assets[0].uri, base64: fallback.assets[0].base64 ?? '' };
  }
}

export async function uploadImage(
  base64: string,
  userId: string,
  fileName: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = getSupabaseClient();

  // Convert base64 to Uint8Array
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  const path = `${userId}/${Date.now()}_${fileName}.jpg`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, byteArray, { contentType: 'image/jpeg', upsert: true });

  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
