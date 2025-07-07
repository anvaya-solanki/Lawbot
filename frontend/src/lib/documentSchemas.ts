// lib/documentSchemas.ts

// This would typically be fetched from an API endpoint
export const documentSchemas = [
  {
    name: 'NDA (Non Disclosure Agreement)',
    input_schema: {
      '<<day>>': 'int',
      '<<month>>': 'string',
      '<<year>>': 'int',
      '<<party1_name>>': 'string',
      '<<party1_alias>>': 'string',
      '<<address1>>': 'string',
      '<<party2_name>>': 'string',
      '<<address2>>': 'string',
      '<<proposed_transaction_details>>': 'string',
      '<<signature1_name_party1>>': 'string',
      '<<signature1_name_party2>>': 'string',
      '<<signature1_designation_party1>>': 'string',
      '<<signature1_designation_party2>>': 'string',
      '<<signature1_place_party1>>': 'string',
      '<<signature1_place_party2>>': 'string',
      '<<signature1_date_party1>>': 'date',
      '<<signature1_date_party2>>': 'date',
      '<<signature2_name_party1>>': 'string',
      '<<signature2_name_party2>>': 'string',
      '<<signature2_designation_party1>>': 'string',
      '<<signature2_designation_party2>>': 'string',
      '<<signature2_place_party1>>': 'string',
      '<<signature2_place_party2>>': 'string',
      '<<signature2_date_party1>>': 'date',
      '<<signature2_date_party2>>': 'date',
    },
  },
  {
    name: 'Employment Agreement',
    input_schema: {
      '<<company_name>>': 'string',
      '<<company_address>>': 'string',
      '<<employee_name>>': 'string',
      '<<employee_address>>': 'string',
      '<<position_title>>': 'string',
      '<<start_date>>': 'date',
      '<<base_salary>>': 'string',
      '<<payment_frequency>>': 'string',
      '<<hours_per_week>>': 'int',
      '<<vacation_days>>': 'int',
      '<<probation_period>>': 'int',
      '<<notice_period>>': 'int',
      '<<company_signatory_name>>': 'string',
      '<<company_signatory_title>>': 'string',
      '<<signing_date>>': 'date',
    },
  },
  {
    name: 'Service Agreement',
    input_schema: {
      '<<client_name>>': 'string',
      '<<client_address>>': 'string',
      '<<service_provider_name>>': 'string',
      '<<service_provider_address>>': 'string',
      '<<service_description>>': 'string',
      '<<start_date>>': 'date',
      '<<end_date>>': 'date',
      '<<payment_amount>>': 'string',
      '<<payment_terms>>': 'string',
      '<<client_signatory_name>>': 'string',
      '<<client_signatory_title>>': 'string',
      '<<provider_signatory_name>>': 'string',
      '<<provider_signatory_title>>': 'string',
      '<<signing_date>>': 'date',
    },
  },
]

export async function fetchDocumentSchemas() {
  // In a real app, this would fetch from an API
  return documentSchemas
}

export async function getDocumentContent(
  documentName: string,
  formData: Record<string, any>
) {
  // In a real app, this would call an API to fill in the document template
  // with the provided form data and return the resulting document content or URL

  console.log(`Generating document: ${documentName}`)
  console.log('Form data:', formData)

  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        documentName,
        formData,
        downloadUrl: '#document-download-url',
      })
    }, 1000)
  })
}
