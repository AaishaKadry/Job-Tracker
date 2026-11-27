import type { ApplicationStatus } from './applications'
import { apiClient } from './client'

export interface DashboardData {
  stats: {
    total_applications: number
    active_applications: number
    interviews_scheduled: number
    offers_received: number
    rejections: number
  }
  applications_over_time: Array<{ month: string; count: number }>
  applications_by_status: Array<{
    status: ApplicationStatus
    count: number
  }>
  interview_conversion: ConversionMetric
  offer_conversion: ConversionMetric
  recent_applications: Array<{
    id: string
    job_title: string
    company_name: string
    status: ApplicationStatus
    application_date: string | null
    created_at: string
  }>
  upcoming_interviews: Array<{
    id: string
    application_id: string
    job_title: string
    company_name: string
    scheduled_at: string
    interview_type: string
  }>
  upcoming_follow_ups: Array<{
    id: string
    application_id: string
    job_title: string
    company_name: string
    due_at: string
    note: string | null
  }>
  latest_activity: Array<{
    id: string
    application_id: string
    job_title: string
    company_name: string
    status: ApplicationStatus
    changed_at: string
  }>
}

export interface ConversionMetric {
  applications_reached_applied: number
  applications_reached_outcome: number
  rate_percent: number | null
}

interface ApiResponse<T> {
  data: T
}

export async function fetchDashboard(
  signal?: AbortSignal,
): Promise<DashboardData> {
  const response = await apiClient.get<ApiResponse<DashboardData>>(
    '/api/analytics/dashboard',
    { signal },
  )
  return response.data
}
