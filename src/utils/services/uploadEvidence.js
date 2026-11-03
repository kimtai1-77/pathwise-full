
import { supabase } from '@/lib/supabaseClient';

export async function uploadEvidenceFile({ file, fileHash, controlId, orgId, mspId, userId }) {
  try {
    // 1. Define unique storage path
    const filePath = `${Date.now()}_${file.name}`;

    // 2. Upload binary to private Supabase Storage Bucket
    const { data: storageData, error: storageError } = await supabase.storage
      .from('compliance_evidence')
      .upload(filePath, file);

    if (storageError) throw storageError;

    // 3. Insert row into PostgreSQL using your exact schema columns
    const { data: dbData, error: dbError } = await supabase
      .from('evidence')
      .insert([
        {
          control_id: controlId,
          org_id: orgId,
          msp_id: mspId,
          file_name: file.name,
          file_path: storageData.path,
          file_type: file.type,
          file_size_bytes: file.size,
          description: null,
          uploaded_by: userId,
          file_hash: fileHash, // Passed directly from the parent
        }
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return { success: true, data: dbData };

  } catch (error) {
    console.error("Upload error:", error.message);
    return { success: false, error: error.message };
  }
}