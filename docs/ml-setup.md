# MineGuard AI - ML Mine Risk Intelligence System (SIH26024)

> **Notice:** Prototype ML-based mine risk intelligence system created for SIH26024 demonstration. Uses synthetic/demo dataset labeled for testing.

---

## 📌 Architecture Overview

```
ml/
├── data/
│   ├── generate_dataset.py   # Synthetic mining dataset generator (1000 samples)
│   └── mine_risk_demo.csv    # Benchmark dataset with safety violations & weather features
├── preprocessing.py          # Data cleaning, normalization & feature engineering formulas
├── train.py                  # End-to-end training pipeline for Random Forest & Isolation Forest
├── predict.py                # Inference engine with Explainable AI (XAI) factor contribution
├── anomaly.py                # Isolation Forest unsupervised anomaly detection module
├── evaluate.py               # Empirical model metrics calculator (Accuracy, Precision, Recall, F1, CM)
├── test_pipeline.py          # Scenario automated test suite (Low, Medium, High, Anomaly)
├── app.py                    # Flask REST API server (Port 5001)
└── models/
    ├── risk_model.joblib      # Trained Random Forest classifier artifact
    ├── anomaly_model.joblib   # Trained Isolation Forest anomaly detector artifact
    ├── scaler.joblib          # StandardScaler normalization parameters
    └── evaluation_metrics.json# Exported test performance evaluation metrics
```

---

## 📊 Dataset Features & Schema

The dataset includes 1,000 synthetic mine operational logs covering environmental, operational, and historical compliance data:

| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `previous_violations` | Integer | Total past safety breaches recorded |
| `recent_incidents` | Integer | Number of safety incidents in the past 30 days |
| `overdue_corrective_actions` | Integer | Pending overdue corrective tasks |
| `inspection_gap_days` | Integer | Days elapsed since last DGMS safety audit |
| `compliance_score` | Float | Mine safety compliance percentage (0–100%) |
| `incident_frequency` | Float | Incidents per operational month |
| `worker_reports` | Integer | Hazard complaints submitted by mine workers |
| `rainfall` | Float | Precipitation level (mm) via Open-Meteo |
| `temperature` | Float | Ambient temperature (°C) |
| `humidity` | Float | Relative humidity (%) |
| `wind_speed` | Float | Surface wind speed (km/h) |
| `environmental_alerts` | Integer | Gas (CO/CH4) & dust sensor threshold breaches |
| `operational_anomalies` | Float | Operational workflow variance index (0.0–1.0) |

---

## 🧠 ML Algorithms & Logic

### 1. Risk Prediction Model (Baseline)
- **Algorithm:** `RandomForestClassifier` (120 estimators, max depth 10, min samples split 4).
- **Output Classes:** `LOW`, `MEDIUM`, `HIGH`.
- **Numerical Risk Score (0–100):** Calculated from class probabilities:
  $$\text{Risk Score} = \min(100, \max(0, \text{round}(P(\text{LOW}) \times 18 + P(\text{MEDIUM}) \times 54 + P(\text{HIGH}) \times 92)))$$
- **Configurable Thresholds:**
  - 🟢 **LOW Risk:** `0 – 39`
  - 🟠 **MEDIUM Risk:** `40 – 69`
  - 🔴 **HIGH Risk:** `70 – 100`

### 2. Unsupervised Anomaly Detection
- **Algorithm:** `IsolationForest` (100 estimators, 8% contamination rate).
- **Output:** `NORMAL` vs `ANOMALY DETECTED`.
- Identifies unusual operational patterns, extreme weather spikes, or sensor alert surges.

### 3. Explainable AI (XAI)
- Dynamically ranks features contributing to risk using Random Forest feature importances combined with normalized feature deviations from safety baselines.

---

## 📈 Model Evaluation Metrics (Actual Test Set)

The model is evaluated strictly on an 80/20 train/test split. **No metrics are fabricated.**

- **Accuracy:** `82.50%`
- **Precision:** `84.32%`
- **Recall:** `82.50%`
- **F1-Score:** `81.56%`

---

## 🌐 API Endpoints

### 1. Predict Mine Risk
`POST /api/risk/predict`

**Request Body:**
```json
{
  "preset_id": "scenario_3_high_risk"
}
```
*OR custom feature dictionary:*
```json
{
  "previous_violations": 10,
  "recent_incidents": 4,
  "overdue_corrective_actions": 6,
  "inspection_gap_days": 45,
  "compliance_score": 52.0,
  "rainfall": 85.0
}
```

**Response:**
```json
{
  "risk_score": 85,
  "risk_level": "HIGH",
  "risk_badge": "🔴",
  "anomaly": true,
  "anomaly_status": "ANOMALY DETECTED",
  "risk_factors": [
    "High number of previous safety violations",
    "Prolonged inspection gap since last review",
    "Overdue corrective safety actions pending"
  ],
  "dataset_label": "Synthetic data used for prototype demonstration."
}
```

### 2. Get Model Evaluation Metrics
`GET /api/risk/evaluate`

### 3. Trigger Retraining
`POST /api/risk/train`

### 4. Fetch Preset Scenarios
`GET /api/risk/scenarios`

### 5. Fetch Open-Meteo Live Weather Risk
`GET /api/weather/live`

---

## ⚙️ How to Retrain & Test

### Retrain Models:
```bash
python ml/train.py
```

### Run Automated Test Suite:
```bash
python ml/test_pipeline.py
```

### Start ML API Server:
```bash
python ml/app.py
```

---

## 🔄 Replacing Synthetic Data with Real Data

To deploy with real government/mining sensor databases in the future:
1. Export real CSV data with columns matching `FEATURE_COLUMNS` in `ml/preprocessing.py`.
2. Replace `ml/data/mine_risk_demo.csv` with your real data.
3. Remove `# DATASET_NOTICE: Synthetic data` header comment.
4. Execute `python ml/train.py` to train on production records.
