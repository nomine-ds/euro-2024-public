export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return Response.json({ message }, { status });
}

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return errorResponse("Supabase environment variables are not configured.", 503);
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
    return errorResponse("NEXT_PUBLIC_SUPABASE_URL must be a Supabase HTTPS origin.", 500);
  }

  const incomingUrl = new URL(request.url);
  const apiPath = incomingUrl.pathname.replace(/^\/api(?=\/|$)/, "");
  const target = new URL(
    `/functions/v1/api${apiPath}${incomingUrl.search}`,
    projectUrl.origin,
  );

  try {
    const response = await fetch(target, {
      headers: {
        apikey: publishableKey,
      },
      cache: "no-store",
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Supabase API proxy request failed:", error);
    return errorResponse("Could not reach the Supabase API.", 502);
  }
}
