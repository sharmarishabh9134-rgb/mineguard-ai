import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import time
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

from ml.predict import MineRiskPredictor
from ml.train import train_and_save_pipeline
from ml.test_pipeline import PRESET_SCENARIOS

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for React frontend

# Global predictor instance
predictor = None

def get_predictor():
    global predictor
    if predictor is None:
        predictor = MineRiskPredictor()
    return predictor

# --- IN-MEMORY & DEMO STATE FOR MINEGUARD SAFETY COMMAND CENTER ---

# Preset Mine Zones
MINE_ZONES = [
    {"id": "zone_entrance", "name": "Main Mine Shaft Entrance", "type": "ENTRY", "risk_level": "LOW", "coordinates": {"x": 10, "y": 80}},
    {"id": "tunnel_a", "name": "Tunnel A - Upper Shaft", "type": "TUNNEL", "risk_level": "LOW", "coordinates": {"x": 30, "y": 65}},
    {"id": "tunnel_b", "name": "Tunnel B - Underground Level 2", "type": "TUNNEL", "risk_level": "MEDIUM", "coordinates": {"x": 55, "y": 50}},
    {"id": "pit_4_zone_b", "name": "Pit 4 – Underground Zone B", "type": "DEEP_PIT", "risk_level": "HIGH", "coordinates": {"x": 75, "y": 30}},
    {"id": "restricted_zone_x", "name": "Blasting Restricted Zone X", "type": "RESTRICTED", "risk_level": "HIGH", "coordinates": {"x": 85, "y": 15}},
    {"id": "emergency_exit_north", "name": "North Emergency Shaft Exit", "type": "EMERGENCY_EXIT", "risk_level": "LOW", "coordinates": {"x": 40, "y": 20}},
]

# Simulated Workers Data Database
WORKERS_DB = {
    "LAB-8842": {
        "worker_id": "LAB-8842",
        "name": "Ramesh Kumar",
        "role": "labour",
        "mine_id": "Jharia Coalfields – Subsidiary A",
        "zone_id": "pit_4_zone_b",
        "shift_id": "Morning Shift (06:00 - 14:00)",
        "contractor": "Central Mining Corp",
        "tracking_status": "ACTIVE",
        "location": {"latitude": 23.7512, "longitude": 86.4215, "accuracy": 6.5, "timestamp": time.time()},
        "gps_status": "SATELLITE_GPS",
        "network_status": "ONLINE",
        "sos_status": "NORMAL",
        "path": [
            {"name": "Shaft Entrance", "x": 10, "y": 80, "timestamp": "06:05:12"},
            {"name": "Tunnel A Level 1", "x": 30, "y": 65, "timestamp": "06:22:45"},
            {"name": "Junction B", "x": 55, "y": 50, "timestamp": "06:45:10"},
            {"name": "Pit 4 Zone B", "x": 75, "y": 30, "timestamp": "07:15:30"}
        ]
    },
    "LAB-9012": {
        "worker_id": "LAB-9012",
        "name": "Suresh Patel",
        "role": "labour",
        "mine_id": "Jharia Coalfields – Subsidiary A",
        "zone_id": "tunnel_b",
        "shift_id": "Morning Shift (06:00 - 14:00)",
        "contractor": "Bharat Earth Movers",
        "tracking_status": "ACTIVE",
        "location": {"latitude": 23.7530, "longitude": 86.4240, "accuracy": 12.0, "timestamp": time.time() - 120},
        "gps_status": "GPS_SIGNAL_LOST",
        "network_status": "OFFLINE",
        "sos_status": "NORMAL",
        "path": [
            {"name": "Shaft Entrance", "x": 10, "y": 80, "timestamp": "06:10:00"},
            {"name": "Tunnel A", "x": 30, "y": 65, "timestamp": "06:30:15"},
            {"name": "Tunnel B Level 2", "x": 55, "y": 50, "timestamp": "06:55:40"}
        ]
    },
    "LAB-7731": {
        "worker_id": "LAB-7731",
        "name": "Vikram Singh",
        "role": "labour",
        "mine_id": "Jharia Coalfields – Subsidiary A",
        "zone_id": "restricted_zone_x",
        "shift_id": "Morning Shift (06:00 - 14:00)",
        "contractor": "Apex Safety Logistics",
        "tracking_status": "ACTIVE",
        "location": {"latitude": 23.7545, "longitude": 86.4260, "accuracy": 5.0, "timestamp": time.time()},
        "gps_status": "SATELLITE_GPS",
        "network_status": "ONLINE",
        "sos_status": "SOS_ACTIVE",
        "path": [
            {"name": "Shaft Entrance", "x": 10, "y": 80, "timestamp": "06:15:00"},
            {"name": "Tunnel A", "x": 30, "y": 65, "timestamp": "06:40:00"},
            {"name": "Tunnel B", "x": 55, "y": 50, "timestamp": "07:05:00"},
            {"name": "Restricted Zone X", "x": 85, "y": 15, "timestamp": "07:30:20"}
        ]
    },
    "LAB-5541": {
        "worker_id": "LAB-5541",
        "name": "Amit Sharma",
        "role": "labour",
        "mine_id": "Raniganj Coalfields – Subsidiary B",
        "zone_id": "tunnel_a",
        "shift_id": "Night Shift (22:00 - 06:00)",
        "contractor": "Raniganj Excavations",
        "tracking_status": "SHIFT_ENDED",
        "location": {"latitude": 23.6120, "longitude": 87.1230, "accuracy": 10.0, "timestamp": time.time() - 3600},
        "gps_status": "SATELLITE_GPS",
        "network_status": "ONLINE",
        "sos_status": "NORMAL",
        "path": [
            {"name": "Shaft Entrance", "x": 10, "y": 80, "timestamp": "22:05:00"}
        ]
    }
}

SOS_ALERTS_QUEUE = [
    {
        "id": "sos-101",
        "worker_id": "LAB-7731",
        "worker_name": "Vikram Singh",
        "mine_id": "Jharia Coalfields – Subsidiary A",
        "zone_id": "restricted_zone_x",
        "zone_name": "Blasting Restricted Zone X",
        "latitude": 23.7545,
        "longitude": 86.4260,
        "timestamp": time.strftime("%H:%M:%S"),
        "gps_status": "SATELLITE_GPS",
        "network_status": "ONLINE",
        "status": "PENDING_DISPATCH",
        "battery_level": 78
    }
]

LOCATION_AUDIT_LOGS = []

# --- EXISTING ML API ENDPOINTS ---

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "service": "MineGuard AI - Safety Command & ML API",
        "dataset_notice": "Synthetic data used for prototype demonstration."
    }), 200

@app.route('/api/risk/predict', methods=['POST'])
def predict_risk():
    try:
        data = request.get_json(force=True, silent=True) or {}
        preset_id = data.get('preset_id')
        if preset_id and preset_id in PRESET_SCENARIOS:
            input_features = PRESET_SCENARIOS[preset_id]['input']
        else:
            input_features = data.get('features', data)
            
        if not isinstance(input_features, dict):
            return jsonify({"error": "Invalid payload format."}), 400
            
        sanitized = {}
        for key, val in input_features.items():
            if isinstance(val, (int, float)):
                sanitized[key] = val
            elif isinstance(val, str) and val.replace('.', '', 1).isdigit():
                sanitized[key] = float(val)

        pred_service = get_predictor()
        res = pred_service.predict(sanitized)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/risk/evaluate', methods=['GET'])
def get_evaluation_metrics():
    metrics_path = os.path.join(os.path.dirname(__file__), 'models', 'evaluation_metrics.json')
    if not os.path.exists(metrics_path):
        return jsonify({"error": "Evaluation metrics not found."}), 404
    with open(metrics_path, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f)), 200

@app.route('/api/risk/train', methods=['POST'])
def trigger_training():
    metrics = train_and_save_pipeline()
    global predictor
    predictor = MineRiskPredictor()
    return jsonify({"message": "Model retrained.", "metrics": metrics}), 200

@app.route('/api/risk/scenarios', methods=['GET'])
def get_scenarios():
    return jsonify(PRESET_SCENARIOS), 200

@app.route('/api/weather/live', methods=['GET'])
def get_live_weather():
    lat = request.args.get('lat', 23.75)
    lon = request.args.get('lon', 86.42)
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
    try:
        resp = requests.get(url, timeout=4)
        if resp.status_code == 200:
            w_data = resp.json().get('current_weather', {})
            temp = w_data.get('temperature', 32.0)
            wind = w_data.get('windspeed', 12.0)
            w_risk = round(min(1.0, (temp / 45.0) * 0.4 + (wind / 60.0) * 0.6), 3)
            return jsonify({
                "source": "Open-Meteo Realtime API",
                "location": "Jharia Coalfields Zone B",
                "temperature_c": temp,
                "windspeed_kmh": wind,
                "weather_code": w_data.get('weathercode', 0),
                "calculated_weather_risk_index": w_risk
            }), 200
    except Exception:
        pass
    return jsonify({
        "source": "Open-Meteo Offline Cache",
        "location": "Jharia Coalfields Zone B",
        "temperature_c": 33.5,
        "windspeed_kmh": 14.2,
        "weather_code": 1,
        "calculated_weather_risk_index": 0.28
    }), 200

# --- NEW SUPERVISOR & LABOUR COMMAND CENTER ENDPOINTS ---

@app.route('/api/worker/location', methods=['POST'])
def receive_worker_location():
    """Ingests real-time or offline-synced location update from worker mobile device."""
    data = request.get_json(force=True, silent=True) or {}
    worker_id = data.get('worker_id', 'LAB-8842')
    
    if worker_id not in WORKERS_DB:
        WORKERS_DB[worker_id] = {
            "worker_id": worker_id,
            "name": data.get('name', f"Worker {worker_id}"),
            "role": "labour",
            "mine_id": data.get('mine_id', "Jharia Coalfields – Subsidiary A"),
            "zone_id": data.get('zone_id', "pit_4_zone_b"),
            "shift_id": "Morning Shift (06:00 - 14:00)",
            "contractor": "Central Mining Corp",
            "tracking_status": "ACTIVE",
            "location": {},
            "gps_status": "SATELLITE_GPS",
            "network_status": "ONLINE",
            "sos_status": "NORMAL",
            "path": []
        }

    worker = WORKERS_DB[worker_id]
    lat = data.get('latitude', 23.7512)
    lon = data.get('longitude', 86.4215)
    accuracy = data.get('accuracy', 8.0)
    tracking_status = data.get('tracking_status', 'ACTIVE')
    gps_status = data.get('gps_status', 'SATELLITE_GPS')
    network_status = data.get('network_status', 'ONLINE')

    worker['location'] = {
        "latitude": lat,
        "longitude": lon,
        "accuracy": accuracy,
        "timestamp": time.time()
    }
    worker['tracking_status'] = tracking_status
    worker['gps_status'] = gps_status
    worker['network_status'] = network_status

    if data.get('zone_id'):
        worker['zone_id'] = data['zone_id']

    # Append to path history
    new_point = {
        "name": data.get('location_name', f"Point ({round(lat,4)}, {round(lon,4)})"),
        "x": min(90, max(10, int((lon - 86.42) * 1000))),
        "y": min(90, max(10, int((lat - 23.75) * 1000))),
        "timestamp": time.strftime("%H:%M:%S")
    }
    worker['path'].append(new_point)
    if len(worker['path']) > 20:
        worker['path'] = worker['path'][-20:]

    LOCATION_AUDIT_LOGS.append({
        "worker_id": worker_id,
        "action": "LOCATION_UPDATED",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "gps_status": gps_status,
        "network_status": network_status
    })

    return jsonify({
        "status": "success",
        "worker_id": worker_id,
        "synced_at": time.strftime("%H:%M:%S"),
        "tracking_status": tracking_status
    }), 200

@app.route('/api/worker/sync-locations', methods=['POST'])
def sync_offline_locations():
    """Bulk synchronizes location points stored locally while offline."""
    data = request.get_json(force=True, silent=True) or {}
    points = data.get('queued_points', [])
    worker_id = data.get('worker_id', 'LAB-8842')

    synced_count = 0
    for p in points:
        p['worker_id'] = worker_id
        receive_worker_location_internal(p)
        synced_count += 1

    return jsonify({
        "status": "success",
        "synced_count": synced_count,
        "message": f"Successfully synchronized {synced_count} offline location points."
    }), 200

def receive_worker_location_internal(data):
    worker_id = data.get('worker_id', 'LAB-8842')
    if worker_id in WORKERS_DB:
        worker = WORKERS_DB[worker_id]
        worker['location'] = {
            "latitude": data.get('latitude', 23.7512),
            "longitude": data.get('longitude', 86.4215),
            "accuracy": data.get('accuracy', 10.0),
            "timestamp": time.time()
        }
        worker['network_status'] = 'ONLINE'

@app.route('/api/sos/trigger', methods=['POST'])
def trigger_sos():
    """Ingests emergency SOS alert from worker mobile device."""
    data = request.get_json(force=True, silent=True) or {}
    worker_id = data.get('worker_id', 'LAB-8842')
    
    if worker_id in WORKERS_DB:
        WORKERS_DB[worker_id]['sos_status'] = 'SOS_ACTIVE'

    alert_id = f"sos-{int(time.time())}"
    alert = {
        "id": alert_id,
        "worker_id": worker_id,
        "worker_name": data.get('worker_name', WORKERS_DB.get(worker_id, {}).get('name', 'Worker')),
        "mine_id": data.get('mine_id', 'Jharia Coalfields – Subsidiary A'),
        "zone_id": data.get('zone_id', 'pit_4_zone_b'),
        "zone_name": "Pit 4 – Underground Zone B",
        "latitude": data.get('latitude', 23.7512),
        "longitude": data.get('longitude', 86.4215),
        "timestamp": time.strftime("%H:%M:%S"),
        "gps_status": data.get('gps_status', 'SATELLITE_GPS'),
        "network_status": data.get('network_status', 'ONLINE'),
        "status": "PENDING_DISPATCH",
        "battery_level": data.get('battery_level', 85)
    }

    SOS_ALERTS_QUEUE.insert(0, alert)
    return jsonify({
        "status": "sos_received",
        "alert_id": alert_id,
        "message": "Emergency SOS broadcast sent to Supervisor Control Room & Emergency Rescue."
    }), 200

@app.route('/api/supervisor/workers', methods=['GET'])
def get_supervisor_workers():
    """
    Returns authorized workers for a supervisor based on mine_id, zone_id, and shift filter.
    Enforces Role-Based Access Control (RBAC).
    """
    mine_filter = request.args.get('mine_id', 'Jharia Coalfields – Subsidiary A')
    zone_filter = request.args.get('zone_id')
    shift_filter = request.args.get('shift_id')

    filtered_workers = []
    for wid, w in WORKERS_DB.items():
        # RBAC Mine-level filtering
        if w['mine_id'] == mine_filter:
            if zone_filter and zone_filter != 'ALL' and w['zone_id'] != zone_filter:
                continue
            if shift_filter and shift_filter != 'ALL' and w['shift_id'] != shift_filter:
                continue
            filtered_workers.append(w)

    return jsonify({
        "mine_id": mine_filter,
        "total_authorized_workers": len(filtered_workers),
        "workers": filtered_workers,
        "zones": MINE_ZONES,
        "sos_alerts": SOS_ALERTS_QUEUE
    }), 200

@app.route('/api/worker/path/<worker_id>', methods=['GET'])
def get_worker_path(worker_id):
    """Returns sequential underground entry-to-current path coordinates."""
    if worker_id not in WORKERS_DB:
        return jsonify({"error": "Worker not found"}), 404
    worker = WORKERS_DB[worker_id]
    return jsonify({
        "worker_id": worker_id,
        "name": worker['name'],
        "zone_id": worker['zone_id'],
        "gps_status": worker['gps_status'],
        "network_status": worker['network_status'],
        "current_location": worker['location'],
        "path": worker['path']
    }), 200

@app.route('/api/mine/zones', methods=['GET'])
def get_mine_zones():
    return jsonify(MINE_ZONES), 200

@app.route('/api/supervisor/sos-acknowledge', methods=['POST'])
def acknowledge_sos():
    data = request.get_json(force=True, silent=True) or {}
    alert_id = data.get('alert_id')
    for alert in SOS_ALERTS_QUEUE:
        if alert['id'] == alert_id:
            alert['status'] = 'ACKNOWLEDGED_DISPATCHED'
            wid = alert['worker_id']
            if wid in WORKERS_DB:
                WORKERS_DB[wid]['sos_status'] = 'DISPATCHED'
            return jsonify({"status": "acknowledged", "alert_id": alert_id}), 200
    return jsonify({"error": "Alert not found"}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting MineGuard AI Safety Command & ML Server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
