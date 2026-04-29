export interface DailyCount { date: string; count: number }
export interface ToolCount { tool: string; count: number; percentage: number }
export interface EcoCount { ecosystem: string; count: number; percentage: number }
export interface ErrorRow { time: string; tool: string; ecosystem: string; statusCode: number }

export interface AnalyticsData {
  totalCalls: number
  successRate: number
  errorCount: number
  mostUsedTool: string
  mostUsedToolCount: number
  mostActiveEcosystem: string
  mostActiveEcoCount: number
  dailyCounts: DailyCount[]
  toolCounts: ToolCount[]
  ecosystemCounts: EcoCount[]
  recentErrors: ErrorRow[]
}
