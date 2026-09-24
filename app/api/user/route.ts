import { NextRequest, NextResponse } from "next/server";
import { signUpAction } from "@/app/lib/auth/actions";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await signUpAction(body);
  return NextResponse.json(result);
}