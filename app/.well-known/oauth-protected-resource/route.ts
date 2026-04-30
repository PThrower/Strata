export const dynamic = 'force-static'

export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://usestrata.dev'
  return Response.json({
    resource: `${appUrl}/mcp`,
    authorization_servers: [appUrl],
  })
}
