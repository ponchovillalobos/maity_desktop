// Supabase Edge Function: deepgram-token
// Genera tokens temporales de Deepgram para transcripción en la nube
// Los usuarios NO configuran su propia API key - siempre se usa el cloud proxy

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar que el método sea POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtener y verificar el JWT del usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar el JWT con Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User authentication failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id, user.email);

    // Obtener la API key de Deepgram del entorno
    const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY");

    // Log para diagnóstico (sin exponer la key)
    console.log("DEEPGRAM_API_KEY configured:", !!deepgramApiKey, "length:", deepgramApiKey?.length || 0);

    if (!deepgramApiKey) {
      console.error("DEEPGRAM_API_KEY not configured in environment");
      return new Response(
        JSON.stringify({ error: "Server configuration error", details: "DEEPGRAM_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Solicitar token temporal a Deepgram
    // Documentación: https://developers.deepgram.com/reference/get-keys
    console.log("Requesting temporary token from Deepgram API...");

    const tokenResponse = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        "Authorization": `Token ${deepgramApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // TTL de 5 minutos (300 segundos)
        time_to_live_in_seconds: 300,
      }),
    });

    // Diagnóstico mejorado: incluir código de error y mensaje de Deepgram
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(
        "Deepgram token generation failed:",
        "status:", tokenResponse.status,
        "statusText:", tokenResponse.statusText,
        "body:", errorText
      );
      return new Response(
        JSON.stringify({
          error: "Token generation failed",
          details: `Deepgram API error ${tokenResponse.status}: ${errorText}`,
          status: tokenResponse.status,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("Deepgram token generated successfully, expires in 300s");

    // Retornar el token temporal al cliente
    return new Response(
      JSON.stringify({
        token: tokenData.key || tokenData.access_token,
        expires_in: 300,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in deepgram-token function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
