import { ArrowLeft, LoaderCircle, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StatePanel'
import { useToast } from '../components/feedback/useToast'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import {
  FormField,
  Input,
  Select,
  Textarea,
} from '../components/ui/FormField'
import { ApiError, apiClient } from '../lib/api/client'
import {
  applicationStatuses,
  employmentTypes,
  fetchApplication,
  fetchCompanies,
  statusLabels,
  type ApplicationPayload,
  type ApplicationStatus,
  type Company,
  type EmploymentType,
  type JobApplication,
  type WorkArrangement,
} from '../lib/api/applications'

interface ApplicationFormValues {
  job_title: string
  company_id: string
  new_company_name: string
  location: string
  employment_type: EmploymentType | ''
  work_arrangement: WorkArrangement | ''
  salary_min: string
  salary_max: string
  salary_currency: string
  job_description: string
  job_url: string
  application_date: string
  status: ApplicationStatus
  recruiter_name: string
  recruiter_email: string
  notes: string
}

type FormErrors = Partial<Record<keyof ApplicationFormValues, string>>

const initialValues: ApplicationFormValues = {
  job_title: '',
  company_id: '',
  new_company_name: '',
  location: '',
  employment_type: '',
  work_arrangement: '',
  salary_min: '',
  salary_max: '',
  salary_currency: '',
  job_description: '',
  job_url: '',
  application_date: '',
  status: 'wishlist',
  recruiter_name: '',
  recruiter_email: '',
  notes: '',
}

const optionalValue = (value: string): string | null => value.trim() || null

function toFormValues(application: JobApplication): ApplicationFormValues {
  return {
    ...initialValues,
    job_title: application.job_title,
    company_id: application.company.id,
    location: application.location ?? '',
    employment_type: application.employment_type ?? '',
    work_arrangement: application.work_arrangement ?? '',
    salary_min: application.salary_min ?? '',
    salary_max: application.salary_max ?? '',
    salary_currency: application.salary_currency ?? '',
    job_description: application.job_description ?? '',
    job_url: application.job_url ?? '',
    application_date: application.application_date ?? '',
    status: application.status,
    recruiter_name: application.recruiter_name ?? '',
    recruiter_email: application.recruiter_email ?? '',
    notes: application.notes ?? '',
  }
}

function validate(values: ApplicationFormValues, creating: boolean): FormErrors {
  const errors: FormErrors = {}
  if (!values.job_title.trim()) errors.job_title = 'Enter a job title.'
  if (!values.company_id && values.new_company_name.trim() === '') {
    if (creating) errors.new_company_name = 'Select or add a company.'
    else errors.company_id = 'Select a company.'
  }

  const minimum = values.salary_min ? Number(values.salary_min) : null
  const maximum = values.salary_max ? Number(values.salary_max) : null
  if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) {
    errors.salary_min = 'Enter a non-negative salary amount.'
  }
  if (maximum !== null && (!Number.isFinite(maximum) || maximum < 0)) {
    errors.salary_max = 'Enter a non-negative salary amount.'
  }
  if (
    minimum !== null &&
    maximum !== null &&
    Number.isFinite(minimum) &&
    Number.isFinite(maximum) &&
    minimum > maximum
  ) {
    errors.salary_max = 'The maximum must be greater than or equal to the minimum.'
  }
  if ((minimum !== null || maximum !== null) && values.salary_currency.trim().length !== 3) {
    errors.salary_currency = 'Enter a three-letter currency code, such as USD.'
  }

  if (values.recruiter_email.trim()) {
    const email = values.recruiter_email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.recruiter_email = 'Enter a valid email address.'
    }
  }

  if (values.job_url.trim()) {
    try {
      const url = new URL(values.job_url.trim())
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.job_url = 'Use an http or https job posting URL.'
      }
    } catch {
      errors.job_url = 'Enter a valid job posting URL.'
    }
  }

  return errors
}

function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'We could not save this application. Please try again.'
}

export function ApplicationFormPage() {
  const { applicationId } = useParams()
  const isEditing = Boolean(applicationId)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [values, setValues] = useState(initialValues)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadFormData() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [companyRecords, application] = await Promise.all([
          fetchCompanies(controller.signal),
          applicationId
            ? fetchApplication(applicationId, controller.signal)
            : Promise.resolve(null),
        ])
        if (!active) return
        setCompanies(companyRecords)
        if (application) {
          setValues(toFormValues(application))
        } else if (companyRecords.length === 0) {
          setIsAddingCompany(true)
        } else if (companyRecords.length === 1) {
          setValues((current) => ({ ...current, company_id: companyRecords[0].id }))
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setLoadError(apiErrorMessage(error))
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadFormData()
    return () => {
      active = false
      controller.abort()
    }
  }, [applicationId])

  function updateField<K extends keyof ApplicationFormValues>(
    key: K,
    value: ApplicationFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values, !isEditing)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showToast({
        title: 'Check the highlighted fields',
        description: 'Some application details need your attention.',
        tone: 'error',
      })
      return
    }

    setIsSaving(true)
    let createdCompany: Company | null = null
    try {
      let companyId = values.company_id
      if (!isEditing && isAddingCompany && !companyId) {
        const response = await apiClient.post<{ data: Company }>('/api/companies', {
          name: values.new_company_name.trim(),
        })
        const savedCompany = response.data
        createdCompany = savedCompany
        companyId = savedCompany.id
        setCompanies((current) => [...current, savedCompany])
        setValues((current) => ({
          ...current,
          company_id: companyId,
          new_company_name: '',
        }))
        setIsAddingCompany(false)
      }

      const payload: ApplicationPayload = {
        company_id: companyId,
        job_title: values.job_title.trim(),
        status: values.status,
        location: optionalValue(values.location),
        salary_min: optionalValue(values.salary_min),
        salary_max: optionalValue(values.salary_max),
        salary_currency:
          values.salary_min || values.salary_max
            ? values.salary_currency.trim().toUpperCase()
            : null,
        employment_type: values.employment_type || null,
        work_arrangement: values.work_arrangement || null,
        job_url: optionalValue(values.job_url),
        application_date: optionalValue(values.application_date),
        job_description: optionalValue(values.job_description),
        recruiter_name: optionalValue(values.recruiter_name),
        recruiter_email: optionalValue(values.recruiter_email),
        notes: optionalValue(values.notes),
      }

      const response = isEditing
        ? await apiClient.put<{ data: JobApplication }>(
            `/api/applications/${applicationId}`,
            payload,
          )
        : await apiClient.post<{ data: JobApplication }>('/api/applications', payload)

      showToast({
        title: isEditing ? 'Application updated' : 'Application created',
        description: `${response.data.job_title} at ${response.data.company.name} is saved.`,
        tone: 'success',
      })
      navigate(`/applications/${response.data.id}`)
    } catch (error) {
      if (createdCompany) {
        showToast({
          title: 'Company saved; application not yet saved',
          description: `${createdCompany.name} is available in the company list. ${apiErrorMessage(error)}`,
          tone: 'error',
        })
      } else {
        showToast({
          title: isEditing ? 'Could not update application' : 'Could not save application',
          description: apiErrorMessage(error),
          tone: 'error',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <LoadingState label={isEditing ? 'Loading application' : 'Loading form'} />
  }

  if (loadError) {
    return (
      <>
        <PageHeader
          description="We could not load the company and application information needed for this form."
          title={isEditing ? 'Edit application' : 'Add application'}
        />
        <Card>
          <CardContent className="pt-4">
            <ErrorState description={loadError} />
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back
          </Button>
        }
        description={
          isEditing
            ? 'Keep the role details and application progress up to date.'
            : 'Capture the details now. You can update them as your search moves forward.'
        }
        eyebrow={isEditing ? 'Application details' : 'New opportunity'}
        title={isEditing ? 'Edit application' : 'Add application'}
      />

      <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">Role details</h2>
            <p className="text-xs text-muted-foreground">
              Tell JobTrack which opportunity you are tracking.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField error={errors.job_title} htmlFor="job-title" label="Job title *">
                <Input
                  autoComplete="organization-title"
                  aria-invalid={Boolean(errors.job_title)}
                  id="job-title"
                  maxLength={200}
                  onChange={(event) => updateField('job_title', event.target.value)}
                  placeholder="e.g. Product Designer"
                  required
                  value={values.job_title}
                />
              </FormField>
            </div>

            {isAddingCompany && !isEditing ? (
              <FormField
                error={errors.new_company_name}
                htmlFor="new-company-name"
                hint="This will also be saved to your reusable company list."
                label="Company *"
              >
                <div className="grid gap-2">
                  <Input
                    aria-invalid={Boolean(errors.new_company_name)}
                    id="new-company-name"
                    maxLength={200}
                    onChange={(event) => updateField('new_company_name', event.target.value)}
                    placeholder="e.g. Northstar Labs"
                    required
                    value={values.new_company_name}
                  />
                  {companies.length > 0 ? (
                    <Button
                      onClick={() => {
                        setIsAddingCompany(false)
                        updateField('new_company_name', '')
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Choose an existing company
                    </Button>
                  ) : null}
                </div>
              </FormField>
            ) : companies.length > 0 ? (
              <FormField
                error={errors.company_id}
                htmlFor="company-id"
                label="Company *"
              >
                <div className="grid gap-2">
                  <Select
                    aria-invalid={Boolean(errors.company_id)}
                    id="company-id"
                    onChange={(event) => updateField('company_id', event.target.value)}
                    required
                    value={values.company_id}
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                  {!isEditing ? (
                    <Button
                      onClick={() => {
                        setIsAddingCompany(true)
                        updateField('company_id', '')
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Add a new company
                    </Button>
                  ) : null}
                </div>
              </FormField>
            ) : null}

            <FormField htmlFor="location" label="Location">
              <Input
                autoComplete="address-level2"
                id="location"
                maxLength={200}
                onChange={(event) => updateField('location', event.target.value)}
                placeholder="City, region, or country"
                value={values.location}
              />
            </FormField>

            <FormField htmlFor="employment-type" label="Employment type">
              <Select
                id="employment-type"
                onChange={(event) => {
                  const selected = employmentTypes.find(
                    (type) => type.value === event.target.value,
                  )
                  updateField('employment_type', selected?.value ?? '')
                }}
                value={values.employment_type}
              >
                <option value="">Not specified</option>
                {employmentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField htmlFor="work-arrangement" label="Work arrangement">
              <Select
                id="work-arrangement"
                onChange={(event) => {
                  const arrangement = event.target.value
                  if (
                    arrangement === 'remote' ||
                    arrangement === 'hybrid' ||
                    arrangement === 'on-site' ||
                    arrangement === ''
                  ) {
                    updateField('work_arrangement', arrangement)
                  }
                }}
                value={values.work_arrangement}
              >
                <option value="">Not specified</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-site</option>
              </Select>
            </FormField>

            <FormField htmlFor="job-url" label="Job posting URL" error={errors.job_url}>
              <Input
                aria-invalid={Boolean(errors.job_url)}
                autoComplete="url"
                id="job-url"
                onChange={(event) => updateField('job_url', event.target.value)}
                placeholder="https://example.com/jobs/123"
                type="url"
                value={values.job_url}
              />
            </FormField>

            <FormField htmlFor="application-date" label="Application date">
              <Input
                id="application-date"
                onChange={(event) => updateField('application_date', event.target.value)}
                type="date"
                value={values.application_date}
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField htmlFor="job-description" label="Job description">
                <Textarea
                  id="job-description"
                  onChange={(event) => updateField('job_description', event.target.value)}
                  placeholder="Add the role details you want to remember…"
                  rows={5}
                  value={values.job_description}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">Application progress</h2>
            <p className="text-xs text-muted-foreground">
              Status changes are saved in your application history.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField htmlFor="application-status" label="Status *">
              <Select
                id="application-status"
                onChange={(event) => {
                  const selected = applicationStatuses.find(
                    (status) => status === event.target.value,
                  )
                  if (selected) updateField('status', selected)
                }}
                required
                value={values.status}
              >
                {applicationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              error={errors.salary_currency}
              htmlFor="salary-currency"
              label="Currency"
            >
              <Input
                aria-invalid={Boolean(errors.salary_currency)}
                autoCapitalize="characters"
                id="salary-currency"
                maxLength={3}
                onChange={(event) => updateField('salary_currency', event.target.value)}
                placeholder="USD"
                value={values.salary_currency}
              />
            </FormField>

            <FormField
              error={errors.salary_min}
              htmlFor="salary-min"
              label="Minimum salary"
            >
              <Input
                aria-invalid={Boolean(errors.salary_min)}
                id="salary-min"
                min="0"
                onChange={(event) => updateField('salary_min', event.target.value)}
                placeholder="90000"
                step="0.01"
                type="number"
                value={values.salary_min}
              />
            </FormField>

            <FormField
              error={errors.salary_max}
              htmlFor="salary-max"
              label="Maximum salary"
            >
              <Input
                aria-invalid={Boolean(errors.salary_max)}
                id="salary-max"
                min="0"
                onChange={(event) => updateField('salary_max', event.target.value)}
                placeholder="120000"
                step="0.01"
                type="number"
                value={values.salary_max}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">People and notes</h2>
            <p className="text-xs text-muted-foreground">
              Optional context to help you follow up thoughtfully.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField htmlFor="recruiter-name" label="Recruiter name">
              <Input
                autoComplete="name"
                id="recruiter-name"
                maxLength={200}
                onChange={(event) => updateField('recruiter_name', event.target.value)}
                placeholder="Recruiter or hiring contact"
                value={values.recruiter_name}
              />
            </FormField>
            <FormField
              error={errors.recruiter_email}
              htmlFor="recruiter-email"
              label="Recruiter email"
            >
              <Input
                aria-invalid={Boolean(errors.recruiter_email)}
                autoComplete="email"
                id="recruiter-email"
                maxLength={320}
                onChange={(event) => updateField('recruiter_email', event.target.value)}
                placeholder="name@example.com"
                type="email"
                value={values.recruiter_email}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField htmlFor="application-notes" label="Notes">
                <Textarea
                  id="application-notes"
                  onChange={(event) => updateField('notes', event.target.value)}
                  placeholder="Interview prep, follow-up context, or anything else to remember…"
                  rows={4}
                  value={values.notes}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-card backdrop-blur">
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Badge tone="info">Private workspace</Badge>
            Your changes are saved to your account.
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              disabled={isSaving}
              onClick={() => navigate(-1)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="size-4" />
              )}
              {isSaving
                ? 'Saving…'
                : isEditing
                  ? 'Save changes'
                  : 'Save application'}
            </Button>
          </div>
        </div>
      </form>

    </>
  )
}
