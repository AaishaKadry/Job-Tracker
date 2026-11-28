import { apiClient } from './client'

export const applicationStatuses = [
  'wishlist',
  'applied',
  'assessment',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
] as const

export type ApplicationStatus = (typeof applicationStatuses)[number]

export const statusLabels: Record<ApplicationStatus, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  assessment: 'Assessment',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export const employmentTypes = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'apprenticeship', label: 'Apprenticeship' },
  { value: 'other', label: 'Other' },
] as const

export type EmploymentType = (typeof employmentTypes)[number]['value']
export type WorkArrangement = 'remote' | 'hybrid' | 'on-site'

export interface CompanySummary {
  id: string
  name: string
}

export interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface JobApplication {
  id: string
  company: CompanySummary
  job_title: string
  status: ApplicationStatus
  location: string | null
  salary_min: string | null
  salary_max: string | null
  salary_currency: string | null
  employment_type: EmploymentType | null
  work_arrangement: WorkArrangement | null
  job_url: string | null
  application_date: string | null
  job_description: string | null
  recruiter_name: string | null
  recruiter_email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ApplicationPayload {
  company_id: string
  job_title: string
  status: ApplicationStatus
  location: string | null
  salary_min: string | null
  salary_max: string | null
  salary_currency: string | null
  employment_type: EmploymentType | null
  work_arrangement: WorkArrangement | null
  job_url: string | null
  application_date: string | null
  job_description: string | null
  recruiter_name: string | null
  recruiter_email: string | null
  notes: string | null
}

export interface ApiResponse<T> {
  data: T
}

export interface PaginatedApplications {
  data: JobApplication[]
  pagination: {
    page: number
    page_size: number
    total: number
    pages: number
  }
}

export async function fetchAllApplications(
  signal?: AbortSignal,
): Promise<JobApplication[]> {
  const pageSize = 100
  const applications: JobApplication[] = []
  let page = 1
  let pages = 1

  do {
    const query = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      sort_by: 'updated_at',
      sort_order: 'desc',
    })
    const response = await apiClient.get<PaginatedApplications>(
      `/api/applications?${query.toString()}`,
      { signal },
    )
    applications.push(...response.data)
    pages = response.pagination.pages
    page += 1
  } while (page <= pages)

  return applications
}

export async function fetchCompanies(signal?: AbortSignal): Promise<Company[]> {
  const response = await apiClient.get<ApiResponse<Company[]>>('/api/companies', {
    signal,
  })
  return response.data
}

export async function fetchApplication(
  applicationId: string,
  signal?: AbortSignal,
): Promise<JobApplication> {
  const response = await apiClient.get<ApiResponse<JobApplication>>(
    `/api/applications/${applicationId}`,
    { signal },
  )
  return response.data
}
