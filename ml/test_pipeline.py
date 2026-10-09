import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set stdout encoding for Windows console safe printing
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from ml.predict import MineRiskPredictor

PRESET_SCENARIOS = {
    "scenario_1_low_risk": {
        "name": "Scenario 1: Low Risk Operational Mine",
        "description": "Mine operating under safe, compliant conditions with regular inspections and low weather impact.",
        "input": {
            "previous_violations": 0,
            "recent_incidents": 0,
            "overdue_corrective_actions": 0,
            "inspection_gap_days": 5,
            "compliance_score": 96.5,
            "incident_frequency": 0.0,
            "worker_reports": 2,
            "rainfall": 2.0,
            "temperature": 26.0,
            "humidity": 55.0,
            "wind_speed": 8.0,
            "environmental_alerts": 0,
            "operational_anomalies": 0.01
        }
    },
    "scenario_2_medium_risk": {
        "name": "Scenario 2: Medium Risk Mine",
        "description": "Moderate safety warning due to overdue actions, pending inspections, and mild weather events.",
        "input": {
            "previous_violations": 3,
            "recent_incidents": 1,
            "overdue_corrective_actions": 2,
            "inspection_gap_days": 35,
            "compliance_score": 76.0,
            "incident_frequency": 0.5,
            "worker_reports": 6,
            "rainfall": 45.0,
            "temperature": 34.0,
            "humidity": 75.0,
            "wind_speed": 22.0,
            "environmental_alerts": 2,
            "operational_anomalies": 0.08
        }
    },
    "scenario_3_high_risk": {
        "name": "Scenario 3: High Risk Mine",
        "description": "Critical mine condition with repeated violations, overdue actions, high incident count, and heavy rainfall.",
        "input": {
            "previous_violations": 12,
            "recent_incidents": 6,
            "overdue_corrective_actions": 9,
            "inspection_gap_days": 82,
            "compliance_score": 42.0,
            "incident_frequency": 2.8,
            "worker_reports": 18,
            "rainfall": 140.0,
            "temperature": 39.0,
            "humidity": 92.0,
            "wind_speed": 55.0,
            "environmental_alerts": 7,
            "operational_anomalies": 0.35
        }
    },
    "scenario_4_anomalous": {
        "name": "Scenario 4: Operational Anomaly Mine",
        "description": "Unusual operational state detected by Isolation Forest algorithm requiring immediate safety verification.",
        "input": {
            "previous_violations": 1,
            "recent_incidents": 0,
            "overdue_corrective_actions": 0,
            "inspection_gap_days": 10,
            "compliance_score": 88.0,
            "incident_frequency": 0.0,
            "worker_reports": 25,
            "rainfall": 0.0,
            "temperature": 44.5,
            "humidity": 20.0,
            "wind_speed": 62.0,
            "environmental_alerts": 9,
            "operational_anomalies": 0.88
        }
    }
}

def run_tests():
    predictor = MineRiskPredictor()
    print("=== Testing MineGuard AI ML Scenarios ===\n")
    
    for key, scenario in PRESET_SCENARIOS.items():
        res = predictor.predict(scenario["input"])
        print(f"[{scenario['name']}]")
        print(f"  Risk Score:     {res['risk_score']}/100")
        print(f"  Risk Level:     {res['risk_badge']} {res['risk_level']}")
        print(f"  Anomaly Status: {res['anomaly_status']} (is_anomaly={res['anomaly']})")
        print(f"  Top Factors:    {', '.join(res['risk_factors'][:3])}")
        print("-" * 60)

if __name__ == '__main__':
    run_tests()
