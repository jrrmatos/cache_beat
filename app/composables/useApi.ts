type Fetcher = <R>(url: string, opts?: Record<string, unknown>) => Promise<R>

const fetcher = $fetch as unknown as Fetcher

export function useApi() {
  async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
    return fetcher<T>(url, { params })
  }

  async function post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    return fetcher<T>(url, { method: 'POST', body })
  }

  async function put<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    return fetcher<T>(url, { method: 'PUT', body })
  }

  async function patch<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    return fetcher<T>(url, { method: 'PATCH', body })
  }

  async function del<T>(url: string): Promise<T> {
    return fetcher<T>(url, { method: 'DELETE' })
  }

  return { get, post, put, patch, del }
}
