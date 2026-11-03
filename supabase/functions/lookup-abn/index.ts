import "@supabase/functions-js/edge-runtime.d.ts";

const ABR_LOOKUP_URL = "https://abr.business.gov.au/json/AbnDetails.aspx";
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers' : 'authorization, x-client-info, apikey, content-type',
}

function isValidAbn(abn: string) {
  if (!/^\d{11}$/.test(abn)) return false;

  const checksum = [...abn].reduce((total, digit, index) => {
    const value = Number(digit) - (index === 0 ? 1 : 0);
    return total + value * ABN_WEIGHTS[index];
  }, 0);

  return checksum % 89 === 0;
}

function parseAbrResponse(body: string) {
  const jsonpMatch = body.trim().match(/^[\w$]+\(([\s\S]*)\);?$/);
  return JSON.parse(jsonpMatch ? jsonpMatch[1] : body);
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), { 
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}

Deno.serve(async (req) => {
    if (req.method == "OPTIONS") {
      return new Response('ok', {headers: corsHeaders});
    }

    if (req.method !== "POST") {
      return jsonError("Only POST requests are supported.", 405);
    }

    let body: { abn?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonError("Request body must be valid JSON.", 400);
    }

    const abn = typeof body.abn === "string" ? body.abn.replace(/[\s-]/g, "") : "";
    if (!/^\d{11}$/.test(abn)) {
      return jsonError("Please enter an 11-digit ABN.", 400);
    }
    if (!isValidAbn(abn)) {
      return jsonError("That ABN is not valid. Check the number and try again.", 400);
    }

    const guid = Deno.env.get("ABR_GUID");
    if (!guid) {
      console.error("ABR_GUID is not configured for the lookup-abn function.");
      return jsonError("ABN lookup is not configured. Add the ABR_GUID secret to the Edge Function.", 503);
    }

    const lookupUrl = new URL(ABR_LOOKUP_URL);
    lookupUrl.search = new URLSearchParams({
      abn,
      callback: "callback",
      guid,
    }).toString();

    let response: Response;
    try {
      response = await fetch(lookupUrl, { signal: AbortSignal.timeout(10_000) });
    } catch (error) {
      console.error("ABR lookup request failed:", error);
      return jsonError("Could not connect to the ABN Lookup service. Please try again.", 502);
    }

    if (!response.ok) {
      console.error(`ABR lookup returned HTTP ${response.status}.`);
      return jsonError("The ABN Lookup service is temporarily unavailable.", 502);
    }

    let result: {
      Abn?: string;
      AbnStatus?: string;
      EntityName?: string;
      EntityTypeName?: string;
      BusinessName?: string[];
      Message?: string;
    };
    try {
      result = parseAbrResponse(await response.text());
    } catch (error) {
      console.error("Could not parse ABR lookup response:", error);
      return jsonError("The ABN Lookup service returned an unreadable response.", 502);
    }

    if (result.Message || !result.Abn) {
      return jsonError(result.Message || "No business was found for that ABN.", 404);
    }

    const name = result.EntityName?.trim() || result.BusinessName?.[0]?.trim();
    if (!name) {
      return jsonError("The ABN Lookup service returned no business name.", 502);
    }

    return new Response(JSON.stringify({
      name,
      entityType: result.EntityTypeName || "",
      abnStatus: result.AbnStatus || "",
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
});

