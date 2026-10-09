import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import joblib
import numpy as np
import pandas as pd

try:
    from ml.preprocessing import ALL_MODEL_FEATURES, FEATURE_COLUMNS, engineer_features
    from ml.anomaly import MineAnomalyDetector
except ImportError:
    from preprocessing import ALL_MODEL_FEATURES, FEATURE_COLUMNS, engineer_features
    from anomaly import MineAnomalyDetector

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
RISK_MODEL_PATH = os.path.join(MODEL_DIR, 'risk_model.joblib')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.joblib')

FEATURE_EXPLANATIONS = {
    'previous_violations': 'High number of previous safety violations',
    'recent_incidents': 'Recent incident frequency escalation',
    'overdue_corrective_actions': 'Overdue corrective safety actions pending',
    'inspection_gap_days': 'Prolonged inspection gap since last review',
    'compliance_score': 'Low safety compliance score',
    'compliance_gap': 'High compliance deficit relative to standards',
    'environmental_alerts': 'Frequent gas/dust environmental sensor alerts',
    'operational_anomalies': 'Unusual operational workflow anomalies',
    'rainfall': 'Heavy rainfall & severe weather impact',
    'weather_risk_index': 'Elevated composite weather risk index',
    'violation_frequency': 'High violation rate per inspection cycle',
    'overdue_action_ratio': 'High ratio of unresolved corrective tasks'
}

# Configurable risk thresholds
RISK_THRESHOLDS = {
    'LOW_MAX': 39,
    'MEDIUM_MAX': 69
}

def get_risk_level_from_score(score):
    if score <= RISK_THRESHOLDS['LOW_MAX']:
        return "LOW", "🟢"
    elif score <= RISK_THRESHOLDS['MEDIUM_MAX']:
        return "MEDIUM", "🟠"
    else:
        return "HIGH", "🔴"

class MineRiskPredictor:
    def __init__(self, model_dir=MODEL_DIR):
        self.model_path = os.path.join(model_dir, 'risk_model.joblib')
        self.scaler_path = os.path.join(model_dir, 'scaler.joblib')
        self.anomaly_path = os.path.join(model_dir, 'anomaly_model.joblib')
        
        self.risk_model = None
        self.scaler = None
        self.anomaly_detector = None
        self.feature_importances = {}
        
        self._load_models()

    def _load_models(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Risk model not found at {self.model_path}. Run 'python ml/train.py' first.")
        
        self.risk_model = joblib.load(self.model_path)
        self.scaler = joblib.load(self.scaler_path)
        self.anomaly_detector = MineAnomalyDetector.load(self.anomaly_path)
        
        # Load feature importances from Random Forest
        importances = self.risk_model.feature_importances_
        self.feature_importances = dict(zip(ALL_MODEL_FEATURES, importances))

    def predict(self, raw_input_data):
        """
        Runs full prediction pipeline on a input dictionary or DataFrame.
        """
        if isinstance(raw_input_data, dict):
            df_input = pd.DataFrame([raw_input_data])
        else:
            df_input = raw_input_data.copy()
            
        default_defaults = {
            'previous_violations': 2,
            'recent_incidents': 0,
            'overdue_corrective_actions': 1,
            'inspection_gap_days': 14,
            'compliance_score': 85.0,
            'incident_frequency': 0.0,
            'worker_reports': 3,
            'rainfall': 5.0,
            'temperature': 30.0,
            'humidity': 60.0,
            'wind_speed': 10.0,
            'environmental_alerts': 0,
            'operational_anomalies': 0.05
        }
        for col, val in default_defaults.items():
            if col not in df_input.columns:
                df_input[col] = val

        df_engineered = engineer_features(df_input)
        X_sample = df_engineered[ALL_MODEL_FEATURES]

        X_scaled = self.scaler.transform(X_sample)
        probs = self.risk_model.predict_proba(X_scaled)[0]
        classes = list(self.risk_model.classes_)

        prob_dict = {cls: float(p) for cls, p in zip(classes, probs)}
        p_low = prob_dict.get('LOW', 0.0)
        p_med = prob_dict.get('MEDIUM', 0.0)
        p_high = prob_dict.get('HIGH', 0.0)

        raw_score = (p_low * 18.0) + (p_med * 54.0) + (p_high * 92.0)
        risk_score = min(100, max(0, int(round(raw_score))))
        
        risk_level, badge = get_risk_level_from_score(risk_score)

        anomaly_res = self.anomaly_detector.predict_sample(df_engineered)

        sample_row = df_engineered.iloc[0]
        factor_contributions = []

        for feature in ALL_MODEL_FEATURES:
            feat_val = sample_row[feature]
            imp = self.feature_importances.get(feature, 0.01)

            if feature == 'compliance_score':
                dev = max(0.0, (90.0 - feat_val) / 90.0)
            elif feature == 'rainfall':
                dev = min(1.0, feat_val / 100.0)
            elif feature == 'previous_violations':
                dev = min(1.0, feat_val / 10.0)
            elif feature == 'recent_incidents':
                dev = min(1.0, feat_val / 5.0)
            elif feature == 'overdue_corrective_actions':
                dev = min(1.0, feat_val / 6.0)
            elif feature == 'inspection_gap_days':
                dev = min(1.0, feat_val / 60.0)
            elif feature == 'environmental_alerts':
                dev = min(1.0, feat_val / 8.0)
            elif feature == 'operational_anomalies':
                dev = min(1.0, feat_val / 0.5)
            elif feature == 'weather_risk_index':
                dev = float(feat_val)
            else:
                dev = float(np.clip(feat_val / 10.0, 0.0, 1.0))

            score_impact = dev * imp * 100.0
            if score_impact > 0.5:
                explanation = FEATURE_EXPLANATIONS.get(feature, f"Elevated {feature.replace('_', ' ')}")
                factor_contributions.append({
                    "feature": feature,
                    "explanation": explanation,
                    "impact_score": round(score_impact, 2)
                })

        factor_contributions.sort(key=lambda x: x['impact_score'], reverse=True)
        top_factors = [f['explanation'] for f in factor_contributions[:5]]
        if not top_factors:
            top_factors = ["Mine operating within normal safety compliance parameters"]

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_badge": badge,
            "anomaly": anomaly_res["is_anomaly"],
            "anomaly_status": anomaly_res["status"],
            "anomaly_score": anomaly_res["score"],
            "risk_factors": top_factors,
            "factor_details": factor_contributions[:5],
            "class_probabilities": {k: round(v, 4) for k, v in prob_dict.items()},
            "weather_input": {
                "rainfall_mm": float(sample_row.get('rainfall', 0)),
                "temp_c": float(sample_row.get('temperature', 0)),
                "wind_kmh": float(sample_row.get('wind_speed', 0)),
                "weather_risk_index": float(sample_row.get('weather_risk_index', 0))
            },
            "dataset_label": "Synthetic data used for prototype demonstration."
        }
