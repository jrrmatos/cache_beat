export function useApi() {
  async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
    return $fetch<T>(url, { params })
  }

  async function post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    return $fetch<T>(url, { method: 'POST', body })
  }

  async function put<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    return $fetch<T>(url, { method: 'PUT', body })
  }

  async function del<T>(url: string): Promise<T> {
    return $fetch<T>(url, { method: 'DELETE' })
  }

  return { get, post, put, del }
}
