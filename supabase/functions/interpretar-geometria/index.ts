import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FORMAS: Record<string, string> = {
  mesa: "mesa",
  bancada: "bancada",
  pia: "pia",
  escada: "escada",
  soleira: "soleira",
  peitoril: "soleira",
  espelho: "espelho",
  coluna: "coluna",
  pilar: "coluna",
  vaso: "vaso",
  janela: "painel",
  painel: "painel",
};

function detectarForma(tipo: string): string {
  const t = tipo.toLowerCase();
  for (const [chave, forma] of Object.entries(FORMAS)) {
    if (t.includes(chave)) return forma;
  }
  return "placa";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tipoTrabalho, descricaoMaterial } = await req.json();

    // Detecção local como fallback inteligente
    const formaLocal = detectarForma(tipoTrabalho || "");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          messages: [
            {
              role: "user",
              content: `Tipo de trabalho em marmoraria: "${tipoTrabalho}", Material: "${descricaoMaterial}".
Retorne APENAS este JSON preenchido, sem mais nada:
{"forma":"${formaLocal}","largura":2.0,"altura":0.08,"profundidade":1.2,"detalhes":"tampo de ${tipoTrabalho.toLowerCase()} em ${descricaoMaterial}"}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const texto = (data.content?.[0]?.text ?? "").trim();
      const match = texto.match(/\{[\s\S]*\}/);

      if (match) {
        const params = JSON.parse(match[0]);
        if (params.forma) {
          return new Response(JSON.stringify(params), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (_) {
      // IA falhou, usa detecção local
    }

    // Fallback inteligente com detecção local
    return new Response(
      JSON.stringify({
        forma: formaLocal,
        largura: 2.0,
        altura: 0.08,
        profundidade: 1.2,
        detalhes: `${tipoTrabalho} em ${descricaoMaterial}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        forma: "placa",
        largura: 2.5,
        altura: 0.08,
        profundidade: 1.8,
        detalhes: "Peça genérica",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
