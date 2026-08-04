import { NextRequest } from "next/server";
import { forwardFriendsRequest } from "../proxy";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return forwardFriendsRequest(request, `/${encodedPath}`);
}

export const GET = forward;
export const POST = forward;
export const DELETE = forward;
