import { NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-action-version, x-blockchain-ids',
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: CORS_HEADERS })
}

export async function GET() {
  const rules = {
    rules: [
      {
        pathPattern: "/fan/*",
        apiPath: "/api/actions/voice/*"
      },
      {
        pathPattern: "/api/actions/voice/*",
        apiPath: "/api/actions/voice/*"
      }
    ]
  }

  return NextResponse.json(rules, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    }
  })
}
