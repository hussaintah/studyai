/**
 * A wrapper around the native fetch API that adds a timeout.
 * @param {string|Request} resource
 * @param {Object} options
 * @param {number} timeout - Timeout in milliseconds.
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}
