
import { supabase } from '@/lib/supabaseClient';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);

export async function uploadEvidenceFile({
  file,
  fileHash,
  controlId,
  tenantId,
  mspId,
  userId,
  supersedesEvidenceId,
}) {
  if (!file || !fileHash || !controlId || !tenantId || !mspId || !userId) {
    return { success: false, error: 'Missing required evidence upload details.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: 'The file exceeds the 50 MiB upload limit.' };
  }

  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    return { success: false, error: 'This file type is not supported.' };
  }

  try {
    const safeFileName = file.name.replace(/[\\/]/g, '_');
    const filePath = `${mspId}/${crypto.randomUUID()}_${safeFileName}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('compliance_evidence')
      .upload(filePath, file);

    if (storageError) throw storageError;

    const evidenceRecord = {
      control_id: controlId,
      tenant_id: tenantId,
      msp_id: mspId,
      file_name: file.name,
      file_path: storageData.path,
      file_type: file.type,
      file_size_bytes: file.size,
      description: null,
      uploaded_by: userId,
      file_hash: fileHash,
    };

    if (supersedesEvidenceId) {
      evidenceRecord.supersedes_evidence_id = supersedesEvidenceId;
    }

    const { data: dbData, error: dbError } = await supabase
      .from('evidence')
      .insert(evidenceRecord)
      .select()
      .single();

    if (dbError) throw dbError;

    return { success: true, data: dbData };

  } catch (error) {
    console.error("Upload error:", error.message);
    return { success: false, error: error.message };
  }
}