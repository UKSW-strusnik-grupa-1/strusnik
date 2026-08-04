import { NextRequest } from "next/server";
import { forwardFriendsRequest } from "./proxy";

export async function GET(request: NextRequest) {
  return forwardFriendsRequest(request, "");
}
