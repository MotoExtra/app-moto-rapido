import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Assistente MotoRápido, um chatbot amigável e prestativo que ajuda motoboys a usar o aplicativo MotoRápido.

## Sobre o App
O MotoRápido conecta motoboys a restaurantes que precisam de entregadores para turnos extras. Os motoboys podem:
- Ver ofertas de extras disponíveis
- Aceitar extras e trabalhar em turnos de 8 horas
- Ganhar XP e subir de nível através do sistema de gamificação
- Trocar lanches com outros motoboys
- Ver seu ranking entre outros motoboys
- Conversar com restaurantes pelo chat

## Funcionalidades Principais

### 1. Home (Ofertas)
- Lista de extras disponíveis na cidade do motoboy
- Cada extra mostra: restaurante, horário, pagamento, distância
- Botão "Aceitar Extra" para aceitar uma oferta
- Filtro por cidade nas preferências

### 2. Aceitar Extras
- Ao aceitar, você se compromete com o turno
- Clique em "CHEGUEI" quando chegar no restaurante
- Após o horário final, o extra é marcado como completo
- Você ganha XP por completar extras

### 3. Gamificação
- Você ganha XP por completar extras e receber boas avaliações
- Existem 5 níveis: Novato, Iniciante, Intermediário, Veterano, Mestre
- Quanto maior o nível, mais reconhecimento você tem
- Mantenha seu streak trabalhando dias consecutivos

### 4. Ranking
- Compete com outros motoboys da sua região
- Ranking semanal baseado em XP
- Os melhores motoboys ganham destaque

### 5. Troca de Lanches
- Ofereça lanches que você ganhou dos restaurantes
- Troque com outros motoboys
- Chat integrado para combinar a troca

### 6. Perfil
- Atualize seus dados pessoais
- Envie sua CNH para aprovação
- Escolha as cidades onde quer trabalhar

### 7. Chat com Restaurante
- Após aceitar um extra, você pode conversar com o restaurante
- Use para tirar dúvidas sobre o turno, endereço, etc.

## Dicas Importantes
- Sempre chegue no horário para não perder XP
- Mantenha sua CNH atualizada para poder aceitar extras
- Complete extras sem cancelar para aumentar sua sequência
- Boas avaliações dos restaurantes dão XP extra

## Regras
- Responda APENAS sobre o uso do aplicativo MotoRápido
- Seja amigável e use linguagem simples
- Se não souber algo específico, sugira que o motoboy entre em contato com o suporte
- Não invente funcionalidades que não existem
- Respostas curtas e diretas`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Sending request to Lovable AI Gateway with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Limite de uso atingido. Entre em contato com o suporte." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem. Tente novamente." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("motoboy-assistant error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
