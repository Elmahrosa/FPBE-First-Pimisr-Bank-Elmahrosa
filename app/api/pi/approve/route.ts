import { type NextRequest, NextResponse } from "next/server"

// Pi Network payment approval endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId } = body

    console.log("[v0] Payment approval requested:", paymentId)

    // Here you would verify the payment with Pi Network backend
    // For now, we'll auto-approve

    return NextResponse.json({
      success: true,
      paymentId,
      message: "Payment approved",
    })
  } catch (error) {
    console.error("[v0] Payment approval error:", error)
    return NextResponse.json({ success: false, error: "Payment approval failed" }, { status: 500 })
  }
}
