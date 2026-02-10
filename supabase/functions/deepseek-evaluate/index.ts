// Supabase Edge Function: deepseek-evaluate
// Evalúa transcripciones de reuniones usando DeepSeek AI
// Genera: título, resumen, evaluación de comunicación, minuta

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Eres un analista experto en comunicación profesional y reuniones de trabajo. Tu tarea es analizar transcripciones de reuniones y generar una evaluación completa.

La transcripción tiene dos tipos de hablantes:
- "user" o "usuario": La persona que está grabando la reunión (evalúa SUS habilidades de comunicación)
- "interlocutor" o cualquier otro nombre: Las demás personas en la reunión

DEBES responder ÚNICAMENTE con un JSON válido (sin markdown, sin bloques de código) con la siguiente estructura exacta:

{
  "title": "Título descriptivo de la reunión (máximo 60 caracteres)",
  "overview": "Resumen de 2-3 oraciones describiendo de qué trató la reunión, los puntos principales discutidos y las conclusiones.",
  "emoji": "Un emoji apropiado que represente el tema principal de la reunión (ej: 💼 trabajo, 📚 educación, 💰 ventas, 🏥 salud)",
  "category": "Una de: work, education, sales, personal, health, technology, finance, legal, creative, other",
  "action_items": [
    {
      "description": "Descripción del pendiente o acción a realizar",
      "assignee": "Persona responsable (user o nombre del interlocutor)",
      "priority": "high | medium | low"
    }
  ],
  "communication_feedback": {
    "summary": "Resumen general de la evaluación de comunicación del usuario en 2-3 oraciones.",
    "strengths": ["Fortaleza 1 del usuario", "Fortaleza 2", "Fortaleza 3"],
    "areas_to_improve": ["Área de mejora 1", "Área de mejora 2"],
    "observations": {
      "clarity": "Observación sobre la claridad del usuario al comunicar ideas.",
      "structure": "Observación sobre cómo el usuario estructura sus intervenciones.",
      "objections": "Observación sobre cómo el usuario maneja objeciones o desacuerdos.",
      "calls_to_action": "Observación sobre las llamadas a la acción que hace el usuario."
    },
    "overall_score": 7,
    "counters": {
      "pero_count": 0,
      "filler_words": { "eh": 0, "mmm": 0, "este": 0, "bueno": 0, "pues": 0, "o sea": 0, "digamos": 0 },
      "objection_words": { "pero": 0, "aunque": 0, "sin embargo": 0 },
      "objections_made": ["Lista de objeciones que HIZO el usuario"],
      "objections_received": ["Lista de objeciones que RECIBIÓ el usuario"]
    },
    "radiografia": {
      "ratio_habla": 0.0,
      "palabras_usuario": 0,
      "palabras_otros": 0,
      "muletillas_total": 0,
      "muletillas_detectadas": {},
      "muletillas_frecuencia": "1 cada N palabras"
    },
    "preguntas": {
      "total_usuario": 0,
      "total_otros": 0
    },
    "temas": {
      "temas_tratados": ["Lista de temas que se discutieron"],
      "acciones_usuario": ["Acciones específicas que el usuario se comprometió a hacer"],
      "temas_sin_cerrar": ["Temas que quedaron pendientes o sin resolución"]
    },
    "clarity": 7,
    "structure": 6,
    "empatia": 5,
    "objetivo": 4,
    "vocabulario": 7,
    "feedback": "Retroalimentación detallada y constructiva sobre la comunicación del usuario, con sugerencias específicas de mejora.",
    "meeting_minutes": "# Minuta de Reunión\\n\\n## Asistentes\\n- ...\\n\\n## Temas Discutidos\\n1. ...\\n\\n## Decisiones Tomadas\\n- ...\\n\\n## Acuerdos\\n- ...\\n\\n## Próximos Pasos\\n- ..."
  }
}

INSTRUCCIONES DETALLADAS PARA CADA CAMPO:

1. **title**: Debe ser conciso y descriptivo. Ejemplo: "Revisión de avances del proyecto Q1"
2. **overview**: Contexto general, NO repetir el título.
3. **emoji**: Un solo emoji Unicode que represente la categoría o tema.
4. **category**: Clasificación principal de la reunión.
5. **action_items**: Pendientes concretos extraídos de la conversación. Si no hay, devuelve array vacío.
6. **communication_feedback**:
   - **counters**: Cuenta EXACTA de muletillas y palabras de objeción del USUARIO (no del interlocutor). Busca: "eh", "mmm", "este" (como muletilla, no como pronombre), "bueno" (como muletilla), "pues", "o sea", "digamos", "pero", "aunque", "sin embargo".
   - **radiografia**: Calcula el ratio de habla (palabras_usuario / palabras_otros), cuenta palabras por hablante, y frecuencia de muletillas.
   - **preguntas**: Cuenta las oraciones interrogativas de cada parte.
   - **Puntuaciones** (clarity, structure, empatia, objetivo, vocabulario): Escala 0-10 basada en el desempeño del USUARIO.
   - **overall_score**: Promedio ponderado de las puntuaciones individuales.
   - **meeting_minutes**: Minuta completa en formato Markdown con secciones: Asistentes, Temas Discutidos, Decisiones Tomadas, Acuerdos, Próximos Pasos.

IMPORTANTE:
- Todas las evaluaciones deben centrarse en el USUARIO (quien graba), no en los interlocutores.
- Los conteos deben ser lo más precisos posible basándose en el texto.
- Si la transcripción es corta o no tiene suficiente contenido, ajusta las puntuaciones proporcionalmente.
- Responde SOLO con el JSON, sin texto adicional, sin backticks, sin markdown.`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar método POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar JWT del usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Parsear el body
    const body = await req.json();
    const { transcript_text, language } = body;

    if (!transcript_text || typeof transcript_text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid transcript_text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (transcript_text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Transcript text is too short for meaningful evaluation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Transcript length:", transcript_text.length, "chars, language:", language || "auto");

    // Obtener API key de DeepSeek
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekApiKey) {
      console.error("DEEPSEEK_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error", details: "DEEPSEEK_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construir el mensaje del usuario
    const langNote = language && language !== "auto"
      ? `\nNota: El idioma principal de la transcripción es ${language}. Responde en español.`
      : "";

    const userMessage = `Analiza la siguiente transcripción de reunión y genera la evaluación completa en el formato JSON especificado.${langNote}\n\nTRANSCRIPCIÓN:\n${transcript_text}`;

    // Llamar a DeepSeek API
    console.log("Calling DeepSeek API...");
    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error("DeepSeek API error:", deepseekResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "DeepSeek API error",
          status: deepseekResponse.status,
          details: errorText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deepseekData = await deepseekResponse.json();
    const content = deepseekData.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in DeepSeek response:", JSON.stringify(deepseekData));
      return new Response(
        JSON.stringify({ error: "Empty response from DeepSeek" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("DeepSeek response received, length:", content.length);

    // Parsear el JSON de la respuesta de DeepSeek
    let evaluation;
    try {
      // Limpiar posibles artefactos de formato (backticks, prefijos)
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      evaluation = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse DeepSeek response as JSON:", parseError);
      console.error("Raw content:", content.substring(0, 500));
      return new Response(
        JSON.stringify({
          error: "Failed to parse evaluation response",
          details: "DeepSeek returned invalid JSON",
          raw_content: content.substring(0, 200),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar campos mínimos requeridos
    if (!evaluation.title || !evaluation.communication_feedback) {
      console.error("Missing required fields in evaluation:", Object.keys(evaluation));
      return new Response(
        JSON.stringify({
          error: "Incomplete evaluation response",
          details: "Missing required fields: title or communication_feedback",
          received_keys: Object.keys(evaluation),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Agregar metadata
    const result = {
      ...evaluation,
      _metadata: {
        model: "deepseek-chat",
        user_id: user.id,
        evaluated_at: new Date().toISOString(),
        transcript_length: transcript_text.length,
        usage: deepseekData.usage || null,
      },
    };

    console.log("Evaluation completed successfully for user:", user.id);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in deepseek-evaluate:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
