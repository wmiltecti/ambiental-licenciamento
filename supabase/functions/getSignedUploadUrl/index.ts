import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SignedUrlRequest {
  process_id: string;
  filename: string;
  contentType: string;
}

interface SignedUrlResponse {
  uploadUrl: string;
  storagePath: string;
  fileId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: SignedUrlRequest = await req.json();
    const { process_id, filename, contentType } = requestData;

    if (!process_id || !filename || !contentType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: process_id, filename, contentType" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: process, error: processError } = await supabaseClient
      .from("license_processes")
      .select("id, user_id")
      .eq("id", process_id)
      .single();

    if (processError || !process) {
      return new Response(
        JSON.stringify({ error: "Process not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (process.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to upload files to this process" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${process_id}/${timestamp}-${randomStr}-${sanitizedFilename}`;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: signedUrlData, error: signedUrlError } = await adminClient
      .storage
      .from("docs")
      .createSignedUploadUrl(storagePath);

    if (signedUrlError) {
      console.error("Error creating signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to create signed upload URL", details: signedUrlError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response: SignedUrlResponse = {
      uploadUrl: signedUrlData.signedUrl,
      storagePath: storagePath,
      fileId: signedUrlData.token,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in getSignedUploadUrl:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
