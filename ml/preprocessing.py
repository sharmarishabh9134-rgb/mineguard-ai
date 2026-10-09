import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

FEATURE_COLUMNS = [
    'previous_violations',
    'recent_incidents',
    'overdue_corrective_actions',
    'inspection_gap_days',
    'compliance_score',
    'incident_frequency',
    'worker_reports',
    'rainfall',
    'temperature',
    'humidity',
    'wind_speed',
    'environmental_alerts',
    'operational_anomalies'
]

ENGINEERED_COLUMNS = [
    'violation_frequency',
    'overdue_action_ratio',
    'weather_risk_index',
    'compliance_gap',
    'anomaly_factor'
]

ALL_MODEL_FEATURES = FEATURE_COLUMNS + ENGINEERED_COLUMNS

def load_raw_dataset(csv_path):
    """Loads CSV dataset, handling comment headers if present."""
    df = pd.read_csv(csv_path, comment='#')
    # Fill missing values if any exist
    df = df.fillna(df.median(numeric_only=True))
    return df

def engineer_features(df_input):
    """Applies domain-specific feature engineering for mine safety risk analysis."""
    df = df_input.copy()
    
    # Avoid division by zero
    inspection_days = np.maximum(df['inspection_gap_days'], 1.0)
    violations = np.maximum(df['previous_violations'], 0.0)
    
    # 1. Violation frequency per month
    df['violation_frequency'] = np.round(violations / (inspection_days / 30.0), 3)
    
    # 2. Overdue corrective action ratio relative to violations
    df['overdue_action_ratio'] = np.round(df['overdue_corrective_actions'] / (violations + 1.0), 3)
    
    # 3. Composite weather risk index (normalized 0.0 - 1.0)
    rain_norm = np.clip(df['rainfall'] / 150.0, 0.0, 1.0)
    temp_norm = np.clip(df['temperature'] / 45.0, 0.0, 1.0)
    wind_norm = np.clip(df['wind_speed'] / 65.0, 0.0, 1.0)
    df['weather_risk_index'] = np.round(rain_norm * 0.5 + temp_norm * 0.25 + wind_norm * 0.25, 3)
    
    # 4. Compliance gap (inverted compliance percentage)
    df['compliance_gap'] = np.round((100.0 - np.clip(df['compliance_score'], 0.0, 100.0)) / 100.0, 3)
    
    # 5. Combined anomaly indicator factor
    df['anomaly_factor'] = np.round(df['operational_anomalies'] * 2.0 + df['environmental_alerts'] * 0.3, 3)
    
    return df

def prepare_data(csv_path):
    """Loads, cleans, engineers features, and splits data into X and y."""
    df = load_raw_dataset(csv_path)
    df_engineered = engineer_features(df)
    
    X = df_engineered[ALL_MODEL_FEATURES]
    y = df_engineered['risk_level']
    
    return df_engineered, X, y

def get_train_test_split(X, y, test_size=0.2, random_state=42):
    """Returns reproducible stratified train/test split."""
    return train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)
