import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LogoRequest {
  style: "monogram" | "silhouette" | "badge" | "typography";
}

const logoPrompts: Record<string, string> = {
  monogram: `Professional logo design for a delivery app called "MotoExtra". 
Create an elegant monogram combining letters "M" and "E" in a modern, minimal style.
- Flat design, clean lines, no gradients
- Primary color: bright orange (#f97316)
- Secondary accent: amber (#fbbf24)
- White or light gray background
- Include subtle speed lines integrated into the M
- App icon style, perfectly centered
- High quality, vector-like appearance
- Modern tech startup aesthetic
- Square format, suitable for app icon
- No text, just the monogram symbol`,

  silhouette: `Professional logo design for a delivery app called "MotoExtra".
Create a minimalist silhouette of a motorcycle/motoboy in motion.
- Modern line art style with clean, bold strokes
- Solid orange color (#f97316)
- White or transparent background
- Dynamic pose suggesting speed and movement
- Simplified, iconic design suitable for small sizes
- App icon style, centered composition
- High quality, vector-like appearance
- No text, just the silhouette
- Square format`,

  badge: `Professional logo design for a delivery app called "MotoExtra".
Create a premium badge/emblem style logo.
- Rounded shield or circular badge shape
- Stylized motorcycle icon in the center
- Colors: orange (#f97316), dark gray (#1f2937), white
- Clean, professional appearance
- Suitable for app icon and branding
- Modern yet trustworthy feel
- High quality, vector-like appearance
- No text inside, just the emblem
- Square format`,

  typography: `Professional logo design for a delivery app called "MotoExtra".
Create a bold, stylized letter "M" that represents speed and delivery.
- The M should have integrated motion lines or arrow elements
- Bold, geometric, modern typography style
- Primary color: orange (#f97316), secondary: amber (#fbbf24)
- White background
- Clean, minimal, flat design
- App icon ready, centered composition
- High quality, vector-like appearance
- Just the letter M with speed elements
- Square format`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { style } = (await req.json()) as LogoRequest;
    
    if (!style || !logoPrompts[style]) {
      throw new Error("Invalid logo style. Use: monogram, silhouette, badge, or typography");
    }

    const prompt = logoPrompts[style];
    console.log(`Generating ${style} logo...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

    console.log(`Successfully generated ${style} logo`);

    return new Response(
      JSON.stringify({ 
        style,
        imageUrl,
        message: `${style} logo generated successfully`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating logo:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
