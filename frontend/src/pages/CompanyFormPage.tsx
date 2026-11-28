import { ArrowLeft, LoaderCircle, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StatePanel'
import { useToast } from '../components/feedback/useToast'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { buttonVariants } from '../components/ui/buttonVariants'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { FormField, Input, Textarea } from '../components/ui/FormField'
import { ApiError, apiClient } from '../lib/api/client'
import type { ApiResponse, Company } from '../lib/api/applications'
import { fetchCompany } from '../lib/api/resources'
import { cn } from '../lib/utils'

interface CompanyValues {
  name: string
  website: string
  industry: string
  location: string
  notes: string
}

type CompanyField = keyof CompanyValues
type FieldErrors = Partial<Record<CompanyField, string>>

const emptyValues: CompanyValues = {
  name: '',
  website: '',
  industry: '',
  location: '',
  notes: '',
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'The company could not be saved. Please try again.'
}

function validate(values: CompanyValues): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.name.trim()) errors.name = 'Enter a company name.'
  if (values.website.trim()) {
    try {
      const url = new URL(values.website.trim())
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.website = 'Use an http or https website address.'
      }
    } catch {
      errors.website = 'Enter a valid website URL, including https://.'
    }
  }
  return errors
}

export function CompanyFormPage() {
  const { companyId } = useParams()
  const isEditing = Boolean(companyId)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [values, setValues] = useState(emptyValues)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!companyId) return
    const controller = new AbortController()
    let active = true
    fetchCompany(companyId, controller.signal)
      .then((company) => {
        if (!active) return
        setValues({
          name: company.name,
          website: company.website ?? '',
          industry: company.industry ?? '',
          location: company.location ?? '',
          notes: company.notes ?? '',
        })
      })
      .catch((cause: unknown) => {
        if (active && !controller.signal.aborted) setLoadError(messageFor(cause))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [companyId])

  function updateField(field: CompanyField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setIsSaving(true)
    const payload = {
      name: values.name.trim(),
      website: values.website.trim() || null,
      industry: values.industry.trim() || null,
      location: values.location.trim() || null,
      notes: values.notes.trim() || null,
    }
    try {
      const response = isEditing
        ? await apiClient.put<ApiResponse<Company>>(`/api/companies/${companyId}`, payload)
        : await apiClient.post<ApiResponse<Company>>('/api/companies', payload)
      showToast({
        title: isEditing ? 'Company updated' : 'Company created',
        description: `${response.data.name} is saved.`,
        tone: 'success',
      })
      navigate(`/companies/${response.data.id}`, { replace: true })
    } catch (error) {
      showToast({
        title: isEditing ? 'Could not update company' : 'Could not create company',
        description: messageFor(error),
        tone: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading company details" />
  if (loadError) {
    return (
      <>
        <PageHeader description="We could not load this company." title="Company details" />
        <Card><CardContent className="pt-4"><ErrorState description={loadError} /></CardContent></Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        actions={
          <Link className={cn(buttonVariants({ variant: 'outline' }))} to={companyId ? `/companies/${companyId}` : '/companies'}>
            <ArrowLeft aria-hidden="true" className="size-4" /> Cancel
          </Link>
        }
        description="Company details can be reused by all of your applications."
        eyebrow={isEditing ? 'Company details' : 'Company directory'}
        title={isEditing ? 'Edit company' : 'Add company'}
      />
      <form className="max-w-3xl" noValidate onSubmit={(event) => void submit(event)}>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">Company information</h2>
            <p className="text-xs text-muted-foreground">Name is required. The rest can be added whenever you have it.</p>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField error={errors.name} htmlFor="company-name" label="Company name *">
                <Input
                  aria-invalid={Boolean(errors.name)}
                  autoComplete="organization"
                  id="company-name"
                  maxLength={200}
                  onChange={(event) => updateField('name', event.target.value)}
                  required
                  value={values.name}
                />
              </FormField>
            </div>
            <FormField error={errors.website} htmlFor="company-website" label="Website">
              <Input
                aria-invalid={Boolean(errors.website)}
                autoComplete="url"
                id="company-website"
                maxLength={2048}
                onChange={(event) => updateField('website', event.target.value)}
                placeholder="https://example.com"
                type="url"
                value={values.website}
              />
            </FormField>
            <FormField htmlFor="company-industry" label="Industry">
              <Input
                id="company-industry"
                maxLength={120}
                onChange={(event) => updateField('industry', event.target.value)}
                value={values.industry}
              />
            </FormField>
            <FormField htmlFor="company-location" label="Location">
              <Input
                id="company-location"
                maxLength={200}
                onChange={(event) => updateField('location', event.target.value)}
                placeholder="City, region, or country"
                value={values.location}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField htmlFor="company-notes" label="Notes">
                <Textarea
                  id="company-notes"
                  onChange={(event) => updateField('notes', event.target.value)}
                  value={values.notes}
                />
              </FormField>
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button disabled={isSaving} type="submit">
                {isSaving ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
                {isSaving ? 'Saving…' : 'Save company'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  )
}
