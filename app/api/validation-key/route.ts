import { NextResponse } from "next/server"
import { CONFIG } from "@/lib/config"

export async function GET() {
  return new NextResponse(CONFIG.piNetwork.validationKey, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  })
}
