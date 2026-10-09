import os
import unittest
from unittest.mock import patch

from ml.app import app


class MlDeploymentSecurityTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_check_is_public_and_does_not_require_service_token(self):
        with patch.dict(os.environ, {'NODE_ENV': 'production', 'ML_SERVICE_TOKEN': 'deployment-test-token'}):
            response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)

    def test_ml_endpoints_require_internal_service_token_in_production(self):
        with patch.dict(os.environ, {'NODE_ENV': 'production', 'ML_SERVICE_TOKEN': 'deployment-test-token'}):
            unauthorized = self.client.get('/api/risk/evaluate')
            authorized = self.client.get(
                '/api/risk/evaluate',
                headers={'X-ML-Service-Token': 'deployment-test-token'}
            )

        self.assertEqual(unauthorized.status_code, 401)
        self.assertEqual(authorized.status_code, 200)


if __name__ == '__main__':
    unittest.main()
