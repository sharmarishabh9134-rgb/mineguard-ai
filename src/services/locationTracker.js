// Real Device Location Tracker with Privacy Control & Audit Logging

import { offlineSyncEngine } from './offlineSync'

const PERMISSION_KEY = 'mineguard_location_permission'
const TRACKING_ENABLED_KEY = 'mineguard_tracking_enabled'

const getWorkerSession = () => {
  try {
    const token=localStorage.getItem('mineguard_jwt_token')||''
    const segment=token.split('.')[1]
    if(!segment)return null
    return JSON.parse(atob(segment.replace(/-/g,'+').replace(/_/g,'/')))
  } catch { return null }
}

class DeviceLocationTracker {
  constructor() {
    this.watchId = null
    this.currentPosition = null
    this.gpsStatus = 'SATELLITE_GPS' // 'SATELLITE_GPS', 'GPS_SIGNAL_LOST', 'DISABLED'
    this.listeners = []
  }

  getPermissionState() {
    return localStorage.getItem(PERMISSION_KEY) || 'PROMPT' // 'PROMPT', 'GRANTED', 'DENIED'
  }

  isTrackingEnabled() {
    return localStorage.getItem(TRACKING_ENABLED_KEY) === 'true'
  }

  subscribe(callback) {
    this.listeners.push(callback)
    callback(this.getState())
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  getState() {
    return {
      permission: this.getPermissionState(),
      enabled: this.isTrackingEnabled(),
      position: this.currentPosition,
      gpsStatus: this.gpsStatus
    }
  }

  notify() {
    const state = this.getState()
    this.listeners.forEach(cb => cb(state))
  }

  logAudit(action, details = {}) {
    try {
      const logs = JSON.parse(localStorage.getItem('mineguard_location_audit_logs')) || []
      logs.unshift({
        action,
        timestamp: new Date().toISOString(),
        details
      })
      localStorage.setItem('mineguard_location_audit_logs', JSON.stringify(logs.slice(0, 50)))
    } catch (e) {
      console.error('Audit log error:', e)
    }
  }

  async requestPermission() {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by this browser/device.')
      return false
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          localStorage.setItem(PERMISSION_KEY, 'GRANTED')
          localStorage.setItem(TRACKING_ENABLED_KEY, 'true')
          this.logAudit('LOCATION_PERMISSION_GRANTED', {
            accuracy: pos.coords.accuracy
          })
          this.startTracking()
          resolve(true)
        },
        (err) => {
          localStorage.setItem(PERMISSION_KEY, 'DENIED')
          localStorage.setItem(TRACKING_ENABLED_KEY, 'false')
          this.logAudit('LOCATION_PERMISSION_DENIED', { code: err.code, message: err.message })
          this.notify()
          resolve(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  toggleTracking(enable) {
    localStorage.setItem(TRACKING_ENABLED_KEY, enable ? 'true' : 'false')
    this.logAudit(enable ? 'TRACKING_RESUMED_BY_WORKER' : 'TRACKING_PAUSED_BY_WORKER')

    if (enable) {
      this.startTracking()
    } else {
      this.stopTracking()
      offlineSyncEngine.clearQueuedLocations()
    }
  }

  startTracking() {
    if (!this.isTrackingEnabled() || this.getPermissionState() !== 'GRANTED') {
      return
    }

    if (this.watchId !== null) return

    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.gpsStatus = 'SATELLITE_GPS'
          this.currentPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          }
          this.notify()

          const session=getWorkerSession()
          // Locations are attached to the authenticated worker, never a demo ID.
          if(!session?.workerId||session.role!=='labour')return
          offlineSyncEngine.queueLocation({
            worker_id: session.workerId,
            mine_id: session.assignedMineLocation||'unknown',
            zone_id: session.zoneId||'',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            gps_status: 'SATELLITE_GPS',
            network_status: navigator.onLine ? 'ONLINE' : 'OFFLINE',
            tracking_status: 'ACTIVE',
            source: 'consented-live-gps-v1'
          })
        },
        (err) => {
          console.warn('GPS Signal unavailable or subterranean interference:', err)
          this.gpsStatus = 'GPS_SIGNAL_LOST'
          this.notify()
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      )
    }
  }

  stopTracking() {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    this.gpsStatus = 'DISABLED'
    this.notify()
  }
}

export const deviceLocationTracker = new DeviceLocationTracker()
