export const dynamic = 'force-static'

export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://usestrata.dev'
  return Response.json({
    issuer: appUrl,
    token_endpoint: `${appUrl}/mcp/token`,
    response_types_supported: ['token'],
    grant_types_supported: ['urn:ietf:params:oauth:grant-type:api-key'],
  })
}
