export async function abnFiller(abnInput) {
  const cleanAbn = abnInput.replace(/[\s-]/g, '');

  if (!/^\d{11}$/.test(cleanAbn)) {
    return { error: 'Please enter an 11-digit ABN.' };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return { error: 'ABN lookup is not configured. Check the Supabase app settings.' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/lookup-abn`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ abn: cleanAbn }),
    });

    let result;
    
    try {
      result = await response.json();
    } catch {
      return { error: 'The ABN lookup service returned an unreadable response.' };
    }

    if (!response.ok) {
      return { error: result?.error || `ABN lookup failed. Server returned status: ${response.status}.` };
    }

    const name = result?.name || result?.entityName || result?.businessName;
    if (typeof name !== 'string' || !name.trim()) {
      return { error: 'ABN lookup returned incomplete business details.' };
    }

    return {
      data: {
        name: name.trim(),
        entityType: result.entityType ?? '',
        abnStatus: result.abnStatus ?? '',
      },
    };
  } catch (err) {
    console.error('Error during ABN lookup:', err);
    return { error: 'Could not connect to the ABN Lookup service. Please check your network.' };
  }
}
