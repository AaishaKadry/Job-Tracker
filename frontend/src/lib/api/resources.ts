import { apiClient } from './client'
import {
  type ApiResponse,
  type Company,
} from './applications'

export type InterviewType = 'HR' | 'Technical' | 'Managerial' | 'Other'

export interface Interview {
  id: string
  application_id: string
  scheduled_at: string
  interview_type: string
  notes: string | null
  outcome: string | null
  created_at: string
  updated_at: string
}

export interface InterviewPayload {
  application_id: string
  scheduled_at: string
  interview_type: InterviewType
  notes: string | null
  outcome: string | null
}

export interface Reminder {
  id: string
  application_id: string
  due_at: string
  note: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface ReminderPayload {
  application_id: string
  due_at: string
  note: string | null
}

export interface ReminderUpdatePayload {
  due_at?: string
  note?: string | null
  is_completed?: boolean
}

export function toLocalDateTimeInput(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function localDateTimeToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function fetchCompany(
  companyId: string,
  signal?: AbortSignal,
): Promise<Company> {
  const response = await apiClient.get<ApiResponse<Company>>(
    `/api/companies/${companyId}`,
    { signal },
  )
  return response.data
}

export async function fetchInterviews(
  signal?: AbortSignal,
): Promise<Interview[]> {
  const response = await apiClient.get<ApiResponse<Interview[]>>(
    '/api/interviews',
    { signal },
  )
  return response.data
}

export async function fetchReminders(
  signal?: AbortSignal,
): Promise<Reminder[]> {
  const response = await apiClient.get<ApiResponse<Reminder[]>>(
    '/api/reminders',
    { signal },
  )
  return response.data
}
