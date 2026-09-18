import { type NextRequest } from "next/server";
import { handleHost } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return handleHost(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
