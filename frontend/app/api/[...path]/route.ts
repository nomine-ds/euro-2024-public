export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number): Response {
  return Response.json({ message }, { status });
}

function validateSupabaseConfig():
  | { projectUrl: URL; publishableKey: string }
  | { error: Response } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return {
      error: errorResponse(
        "Supabase environment variables are not configured.",
        503,
      ),
    };
  }

  const projectUrl = new URL(supabaseUrl);
  if (
    (projectUrl.protocol !== "https:" && projectUrl.hostname !== "localhost") ||
    projectUrl.pathname !== "/" ||
    projectUrl.search ||
    projectUrl.hash ||
    projectUrl.username ||
    projectUrl.password
  ) {
    return {
      error: errorResponse(
        "NEXT_PUBLIC_SUPABASE_URL must be a Supabase HTTPS origin.",
        500,
      ),
    };
  }

  return { projectUrl, publishableKey };
}

async function proxyRequest(request: Request): Promise<Response> {
  const config = validateSupabaseConfig();
  if ("error" in config) return config.error;

  const { projectUrl, publishableKey } = config;
  const incomingUrl = new URL(request.url);
  const apiPath = incomingUrl.pathname.replace(/^\/api(?=\/|$)/, "");
  const target = new URL(
    `/functions/v1/api${apiPath}${incomingUrl.search}`,
    projectUrl.origin,
  );

  const init: RequestInit = {
    method: request.method,
    headers: {
      apikey: publishableKey,
      "Content-Type":
        request.headers.get("Content-Type") || "application/json",
    },
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const response = await fetch(target, init);

    // Paksa charset=utf-8 biar tidak decode sebagai Latin-1 (mojibake)
    const upstreamType =
      response.headers.get("Content-Type") || "application/json";
    const contentTypeWithCharset = upstreamType.includes("charset")
      ? upstreamType
      : `${upstreamType}; charset=utf-8`;

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": contentTypeWithCharset,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Supabase API proxy request failed:", error);
    return errorResponse("Could not reach the Supabase API.", 502);
  }
}

export async function GET(request: Request): Promise<Response> {
  return proxyRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return proxyRequest(request);
}

export async function PUT(request: Request): Promise<Response> {
  return proxyRequest(request);
}

export async function PATCH(request: Request): Promise<Response> {
  return proxyRequest(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return proxyRequest(request);
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}