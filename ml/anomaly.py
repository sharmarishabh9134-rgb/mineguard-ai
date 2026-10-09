import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

try:
    from ml.preprocessing import ALL_MODEL_FEATURES, engineer_features
except ImportError:
    from preprocessing import ALL_MODEL_FEATURES, engineer_features

ANOMALY_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'anomaly_model.joblib')

class MineAnomalyDetector:
    def __init__(self, contamination=0.08, random_state=42):
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=random_state
        )
        self.feature_names = ALL_MODEL_FEATURES

    def fit(self, X):
        """Fits IsolationForest model on operational features."""
        self.model.fit(X[self.feature_names])
        return self

    def predict_sample(self, X_sample):
        """
        Predicts whether a sample represents normal operations or an anomaly.
        """
        if isinstance(X_sample, dict):
            df_single = pd.DataFrame([X_sample])
            if not all(col in df_single.columns for col in self.feature_names):
                df_single = engineer_features(df_single)
            X_data = df_single[self.feature_names]
        elif isinstance(X_sample, pd.DataFrame):
            if not all(col in X_sample.columns for col in self.feature_names):
                X_data = engineer_features(X_sample)[self.feature_names]
            else:
                X_data = X_sample[self.feature_names]
        else:
            X_data = X_sample

        pred = self.model.predict(X_data)[0]  # 1 for inliers, -1 for outliers
        score = self.model.decision_function(X_data)[0]

        is_anomaly = bool(pred == -1)
        status = "ANOMALY DETECTED" if is_anomaly else "NORMAL"

        return {
            "is_anomaly": is_anomaly,
            "status": status,
            "score": round(float(score), 4)
        }

    def save(self, filepath=ANOMALY_MODEL_PATH):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self.model, filepath)
        print(f"Saved anomaly detection model to {filepath}")

    @classmethod
    def load(cls, filepath=ANOMALY_MODEL_PATH):
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Anomaly model not found at {filepath}. Please run train.py first.")
        detector = cls()
        detector.model = joblib.load(filepath)
        return detector
