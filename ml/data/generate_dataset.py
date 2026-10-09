import os
import numpy as np
import pandas as pd

def generate_synthetic_mine_data(num_samples=1000, random_seed=42):
    np.random.seed(random_seed)
    
    # Generate realistic mining safety features
    previous_violations = np.random.poisson(lam=3.5, size=num_samples)
    recent_incidents = np.random.poisson(lam=1.2, size=num_samples)
    overdue_corrective_actions = np.random.poisson(lam=2.0, size=num_samples)
    inspection_gap_days = np.random.randint(1, 90, size=num_samples)
    compliance_score = np.clip(np.random.normal(loc=78.0, scale=12.0, size=num_samples), 30.0, 100.0)
    incident_frequency = np.round(recent_incidents / (np.random.uniform(1.0, 3.0, size=num_samples)), 2)
    worker_reports = np.random.poisson(lam=5.0, size=num_samples)
    
    # Weather features (Open-Meteo aligned)
    rainfall = np.clip(np.random.exponential(scale=20.0, size=num_samples), 0.0, 180.0)
    temperature = np.random.normal(loc=32.0, scale=6.0, size=num_samples)
    humidity = np.clip(np.random.normal(loc=65.0, scale=15.0, size=num_samples), 20.0, 98.0)
    wind_speed = np.clip(np.random.gamma(shape=2.0, scale=8.0, size=num_samples), 0.0, 70.0)
    
    # Operational alerts & anomalies
    environmental_alerts = np.random.poisson(lam=1.5, size=num_samples)
    operational_anomalies = np.clip(np.random.beta(a=0.5, b=5.0, size=num_samples), 0.0, 1.0)
    
    # Compute ground truth composite risk score (0 - 100)
    noise = np.random.normal(0, 4.0, size=num_samples)
    composite_risk = (
        previous_violations * 4.2 +
        recent_incidents * 6.5 +
        overdue_corrective_actions * 5.0 +
        (inspection_gap_days / 10.0) * 2.5 +
        (100.0 - compliance_score) * 0.45 +
        environmental_alerts * 3.5 +
        (rainfall / 150.0) * 15.0 +
        operational_anomalies * 25.0 +
        noise
    )
    
    # Normalize risk score to 0 - 100 range
    risk_score = np.clip(composite_risk, 0.0, 100.0)
    
    # Assign Risk Level: LOW (0-39), MEDIUM (40-69), HIGH (70-100)
    risk_level = []
    for score in risk_score:
        if score < 40.0:
            risk_level.append("LOW")
        elif score < 70.0:
            risk_level.append("MEDIUM")
        else:
            risk_level.append("HIGH")
            
    df = pd.DataFrame({
        'previous_violations': previous_violations,
        'recent_incidents': recent_incidents,
        'overdue_corrective_actions': overdue_corrective_actions,
        'inspection_gap_days': inspection_gap_days,
        'compliance_score': np.round(compliance_score, 1),
        'incident_frequency': incident_frequency,
        'worker_reports': worker_reports,
        'rainfall': np.round(rainfall, 1),
        'temperature': np.round(temperature, 1),
        'humidity': np.round(humidity, 1),
        'wind_speed': np.round(wind_speed, 1),
        'environmental_alerts': environmental_alerts,
        'operational_anomalies': np.round(operational_anomalies, 3),
        'ground_truth_score': np.round(risk_score, 1),
        'risk_level': risk_level
    })
    
    return df

if __name__ == '__main__':
    data_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(data_dir, exist_ok=True)
    csv_path = os.path.join(data_dir, 'mine_risk_demo.csv')
    
    df = generate_synthetic_mine_data(num_samples=1000, random_seed=42)
    
    # Add clear dataset label comment header
    with open(csv_path, 'w', encoding='utf-8') as f:
        f.write("# DATASET_NOTICE: Synthetic data used for prototype demonstration.\n")
        df.to_csv(f, index=False)
        
    print(f"Generated synthetic mine risk dataset with {len(df)} rows at {csv_path}")
    print(df['risk_level'].value_counts())
