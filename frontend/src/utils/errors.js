/** Human-readable message from an Axios error or any thrown value. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response) {
    return error.response.data?.message || fallback
  }
  if (error?.request) {
    return 'Cannot reach the server. Check that the backend is running and try again.'
  }
  return error?.message || fallback
}

/** { fieldName: message } from a 400 validation response, or {} */
export function getFieldErrors(error) {
  return error?.response?.data?.fieldErrors || {}
}
