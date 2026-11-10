import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import './styles/OrgLogoSettings.css';

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

export function OrgLogoSettings({ mspId, mspName, onLogoUpdated }) {
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPath, setLogoPath] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLogo() {
      if (!mspId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data: logo, error: logoError } = await supabase
        .from('logos')
        .select('file_path')
        .eq('msp_id', mspId)
        .maybeSingle();

      if (cancelled) return;
      if (logoError) {
        setError('Unable to load the current company logo.');
        setIsLoading(false);
        return;
      }

      if (!logo?.file_path) {
        setLogoUrl('');
        setLogoPath('');
        onLogoUpdated?.('');
        setIsLoading(false);
        return;
      }

      setLogoPath(logo.file_path);
      const { data: signedLogo, error: signedUrlError } = await supabase.storage
        .from('logos')
        .createSignedUrl(logo.file_path, 60 * 60);

      if (cancelled) return;
      if (signedUrlError) {
        setLogoUrl('');
        onLogoUpdated?.('');
        setError('The saved logo file is missing. Remove its record or upload a replacement.');
      } else {
        setLogoUrl(signedLogo.signedUrl);
        onLogoUpdated?.(signedLogo.signedUrl);
      }
      setIsLoading(false);
    }

    loadLogo();
    return () => { cancelled = true; };
  }, [mspId, onLogoUpdated]);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError('');
    setStatus('');
    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setSelectedFile(null);
      clearPreview();
      setError('Choose a PNG, JPG, or SVG image.');
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      setSelectedFile(null);
      clearPreview();
      setError('Logo files must be 5 MB or smaller.');
      return;
    }

    clearPreview();
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setSelectedPreviewUrl(previewUrl);
    setSelectedFile(file);
  }

  function clearPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setSelectedPreviewUrl('');
  }

  function openFilePicker() {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  }

  function cancelSelection() {
    setSelectedFile(null);
    clearPreview();
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function updateLogo() {
    if (!selectedFile || !mspId || isSaving) return;

    setIsSaving(true);
    setError('');
    setStatus('');
    const filePath = `${mspId}/logo`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          contentType: selectedFile.type,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase
        .from('logos')
        .upsert({ msp_id: mspId, file_path: filePath }, { onConflict: 'msp_id' });
      if (metadataError) throw metadataError;

      const { data: signedLogo, error: signedUrlError } = await supabase.storage
        .from('logos')
        .createSignedUrl(filePath, 60 * 60);
      if (signedUrlError) throw signedUrlError;

      setLogoUrl(signedLogo.signedUrl);
      setLogoPath(filePath);
      onLogoUpdated?.(signedLogo.signedUrl);
      setSelectedFile(null);
      clearPreview();
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatus('Company logo updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update the company logo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function removeLogo() {
    if (!mspId || !logoPath || isRemoving || isSaving) return;

    setIsRemoving(true);
    setError('');
    setStatus('');

    try {
      const { error: storageError } = await supabase.storage
        .from('logos')
        .remove([logoPath]);
      const objectAlreadyRemoved = storageError && (
        Number(storageError.statusCode) === 404 ||
        /not found|does not exist/i.test(storageError.message)
      );
      if (storageError && !objectAlreadyRemoved) throw storageError;

      const { error: metadataError } = await supabase
        .from('logos')
        .delete()
        .eq('msp_id', mspId);
      if (metadataError) throw metadataError;

      setLogoUrl('');
      setLogoPath('');
      onLogoUpdated?.('');
      setStatus('Company logo removed.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove the company logo.');
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <section className="owner-settings-panel org-logo-settings">
      <div className="owner-settings-section-heading">
        <h3>Company logo</h3>
        <p>Manage the logo shown in your Pathwise workspace.</p>
      </div>

      <div className="org-logo-editor">
        <div className="org-logo-current" aria-label={selectedPreviewUrl ? 'Selected company logo preview' : logoUrl ? 'Current company logo' : 'No company logo uploaded'}>
          {isLoading ? <span>Loading</span> : selectedPreviewUrl || logoUrl ? (
            <img src={selectedPreviewUrl || logoUrl} alt={`${selectedFile?.name || mspName || 'Company'} logo`} />
          ) : (
            <span>Logo</span>
          )}
        </div>

        <div className="org-logo-actions">
          <input
            ref={fileInputRef}
            className="org-logo-file-input"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFileChange}
            aria-label="Choose company logo"
          />
          {!selectedFile ? (
            <div className="org-logo-action-row">
              <button
                className="profile-settings-cancel"
                type="button"
                onClick={openFilePicker}
                disabled={isLoading || !mspId || isRemoving}
              >
                {logoUrl ? 'Replace logo' : 'Add logo'}
              </button>
              {logoPath && (
                <button className="org-logo-remove" type="button" onClick={removeLogo} disabled={isRemoving}>
                  {isRemoving ? 'Removing...' : 'Remove logo'}
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="org-logo-selected-file">Selected: {selectedFile.name}</p>
              <div className="org-logo-action-row">
                <button className="profile-settings-submit" type="button" onClick={updateLogo} disabled={isSaving}>
                  {isSaving ? 'Updating...' : 'Update logo'}
                </button>
                <button className="profile-settings-cancel" type="button" onClick={cancelSelection} disabled={isSaving}>
                  Cancel
                </button>
                <button className="profile-settings-cancel" type="button" onClick={openFilePicker} disabled={isSaving}>
                  Choose another
                </button>
              </div>
            </>
          )}
          <p className="profile-settings-help">PNG, JPG, or SVG. Maximum 5 MB.</p>
        </div>
      </div>

      {error && <p className="profile-settings-message is-error" role="alert">{error}</p>}
      {status && <p className="profile-settings-message is-success" role="status">{status}</p>}
    </section>
  );
}