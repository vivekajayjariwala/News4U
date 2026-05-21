import config from '../config/config';

function buildUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${config.api.baseUrl}${path}`;
}

function prepareBody(body) {
  if (!body) {
    return { data: undefined, headers: {} };
  }

  if (body instanceof FormData) {
    return { data: body, headers: {} };
  }

  return {
    data: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (payload && payload.error) ||
      (payload && payload.message) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function request(path, { method = 'GET', headers = {}, body, baseUrl } = {}) {
  const url = baseUrl ? `${baseUrl}${path}` : buildUrl(path);
  const prepared = prepareBody(body);

  const mergedHeaders = {
    ...prepared.headers,
    ...headers,
  };

  const response = await fetch(url, {
    method,
    headers: mergedHeaders,
    body: prepared.data,
  });

  return parseResponse(response);
}

export default {
  request,
};
