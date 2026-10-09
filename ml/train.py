import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

try:
    from ml.preprocessing import prepare_data, get_train_test_split, ALL_MODEL_FEATURES
    from ml.anomaly import MineAnomalyDetector
    from ml.evaluate import evaluate_model_performance, save_evaluation_metrics
except ImportError:
    from preprocessing import prepare_data, get_train_test_split, ALL_MODEL_FEATURES
    from anomaly import MineAnomalyDetector
    from evaluate import evaluate_model_performance, save_evaluation_metrics

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'mine_risk_demo.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

def train_and_save_pipeline(csv_path=DATA_PATH, output_dir=MODEL_DIR):
    os.makedirs(output_dir, exist_ok=True)
    print(f"--- Starting MineGuard AI ML Training Pipeline ---")
    print(f"Dataset: {csv_path}")

    # 1. Load and Preprocess Data
    df_engineered, X, y = prepare_data(csv_path)
    X_train, X_test, y_train, y_test = get_train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    # 2. Scale Features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 3. Train Baseline Risk Prediction Model (Random Forest)
    print("Training Random Forest Risk Classifier...")
    rf_model = RandomForestClassifier(
        n_estimators=120,
        max_depth=10,
        min_samples_split=4,
        random_state=42
    )
    rf_model.fit(X_train_scaled, y_train)

    # 4. Train Isolation Forest Anomaly Detector
    print("Training Isolation Forest Anomaly Detector...")
    anomaly_detector = MineAnomalyDetector(contamination=0.08, random_state=42)
    anomaly_detector.fit(X_train)

    # 5. Evaluate Model on Test Set (Strict evaluation, no fake numbers)
    print("Evaluating Model Performance on Test Data...")
    metrics = evaluate_model_performance(rf_model, X_test_scaled, y_test)

    # 6. Save Model Artifacts
    risk_model_path = os.path.join(output_dir, 'risk_model.joblib')
    scaler_path = os.path.join(output_dir, 'scaler.joblib')
    metrics_path = os.path.join(output_dir, 'evaluation_metrics.json')

    joblib.dump(rf_model, risk_model_path)
    joblib.dump(scaler, scaler_path)
    anomaly_detector.save(os.path.join(output_dir, 'anomaly_model.joblib'))
    save_evaluation_metrics(metrics, metrics_path)

    print("\n--- Training Pipeline Completed Successfully ---")
    print(f"Accuracy:  {metrics['accuracy'] * 100:.2f}%")
    print(f"Precision: {metrics['precision'] * 100:.2f}%")
    print(f"Recall:    {metrics['recall'] * 100:.2f}%")
    print(f"F1-Score:  {metrics['f1_score'] * 100:.2f}%")
    print(f"Confusion Matrix:\n {metrics['confusion_matrix']}")
    print(f"All artifacts saved in {output_dir}")

    return metrics

if __name__ == '__main__':
    train_and_save_pipeline()
