const getMlServiceUrl = () => {
  const configuredUrl = process.env.ML_SERVICE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (process.env.NODE_ENV !== 'production') return 'http://127.0.0.1:5001';
  return null;
};

export const proxyMlRequest = endpoint => async (req, res) => {
  const serviceUrl = getMlServiceUrl();
  if (!serviceUrl) {
    return res.status(503).json({
      success: false,
      message: 'The MineGuard ML service is not configured.'
    });
  }

  const serviceToken = process.env.ML_SERVICE_TOKEN;
  if (process.env.NODE_ENV === 'production' && !serviceToken) {
    return res.status(503).json({
      success: false,
      message: 'The MineGuard ML service is not configured.'
    });
  }

  try {
    const response = await fetch(`${serviceUrl}${endpoint}`, {
      method: req.method,
      headers: {
        ...(req.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        ...(serviceToken ? { 'X-ML-Service-Token': serviceToken } : {})
      },
      ...(req.method === 'POST' ? { body: JSON.stringify(req.body) } : {}),
      signal: AbortSignal.timeout(10000)
    });
    const body = await response.text();
    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) res.set('Content-Type', contentType);
    return res.send(body);
  } catch {
    return res.status(502).json({
      success: false,
      message: 'The MineGuard ML service is unavailable.'
    });
  }
};
