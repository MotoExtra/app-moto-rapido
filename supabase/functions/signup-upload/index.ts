import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const userId = formData.get("user_id") as string;
    const fileType = formData.get("file_type") as string; // "avatar" or "cnh"
    const file = formData.get("file") as File;

    if (!userId || !fileType || !file) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, file_type, file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["avatar", "cnh"].includes(fileType)) {
      return new Response(
        JSON.stringify({ error: "file_type must be 'avatar' or 'cnh'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user exists in auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileExt = file.name.split(".").pop();
    let bucket: string;
    let filePath: string;

    if (fileType === "avatar") {
      bucket = "avatars";
      filePath = `${userId}/avatar.${fileExt}`;
    } else {
      bucket = "cnh-documents";
      filePath = `${userId}/cnh.${fileExt}`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let publicUrl: string | null = null;
    if (fileType === "avatar") {
      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
      publicUrl = data.publicUrl;
    }

    return new Response(
      JSON.stringify({
        success: true,
        path: filePath,
        public_url: publicUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
