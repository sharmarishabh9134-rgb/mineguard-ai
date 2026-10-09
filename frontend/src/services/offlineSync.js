import { apiFetch } from './apiUrl.js'
// Offline Location & SOS Synchronization Engine for MineGuard AI Labour Mobile App

const QUEUE_KEY = 'mineguard_offline_locations'
const SOS_QUEUE_KEY = 'mineguard_offline_sos'

const currentSession = () => {
  try {
    const token=localStorage.getItem('mineguard_jwt_token')||''
    const payload=token.split('.')[1]
    if(!payload)return {token:'',workerId:''}
    const user=JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')))
    return {token,workerId:String(user.workerId||'').toUpperCase(),role:user.role}
  } catch { return {token:'',workerId:''} }
}

class OfflineSyncEngine {
  constructor() {
    this.isOnline = navigator.onLine
    this.syncStatus = this.isOnline ? 'ONLINE' : 'OFFLINE' // 'ONLINE', 'OFFLINE', 'SYNCING', 'SYNC_COMPLETE'
    this.listeners = []
    
    this.initEventListeners()
  }

  initEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.updateStatus('SYNCING')
      this.syncQueues()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.updateStatus('OFFLINE')
    })
  }

  subscribeStatus(callback) {
    this.listeners.push(callback)
    callback(this.getStatus())
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  updateStatus(status) {
    this.syncStatus = status
    const details = this.getStatus()
    this.listeners.forEach(cb => cb(details))
  }

  getStatus() {
    const locQueue = this.getQueuedLocations()
    const sosQueue = this.getQueuedSOS()
    return {
      isOnline: this.isOnline,
      status: this.syncStatus,
      queuedLocationsCount: locQueue.length,
      queuedSOSCount: sosQueue.length,
      lastSyncTime: localStorage.getItem('mineguard_last_sync') || 'Not synced yet'
    }
  }

  getQueuedLocations() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []
    } catch {
      return []
    }
  }

  getQueuedSOS() {
    try {
      return JSON.parse(localStorage.getItem(SOS_QUEUE_KEY)) || []
    } catch {
      return []
    }
  }

  async queueLocation(locationPoint) {
    const queue = this.getQueuedLocations()
    queue.push({
      ...locationPoint,
      client_timestamp: new Date().toISOString()
    })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-200)))
    this.updateStatus(this.isOnline ? 'ONLINE' : 'OFFLINE')

    if (this.isOnline) {
      await this.syncQueues()
    }
  }

  async queueSOS(sosData) {
    const queue = this.getQueuedSOS()
    queue.push({
      ...sosData,
      queued_at: new Date().toISOString()
    })
    localStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue))
    this.updateStatus(this.isOnline ? 'ONLINE' : 'OFFLINE')

    if (this.isOnline) {
      await this.syncQueues()
    }
  }

  clearQueuedLocations() {
    localStorage.removeItem(QUEUE_KEY)
    this.updateStatus(this.isOnline ? 'ONLINE' : 'OFFLINE')
  }

  async syncQueues() {
    if (!this.isOnline) return

    const session=currentSession()
    const storedLocQueue=this.getQueuedLocations()
    const locQueue=session.role==='labour'&&session.workerId?storedLocQueue.filter(point=>point.source==='consented-live-gps-v1'&&String(point.worker_id||'').toUpperCase()===session.workerId):[]
    const sosQueue = this.getQueuedSOS()

    if(storedLocQueue.length!==locQueue.length&&session.token) localStorage.setItem(QUEUE_KEY,JSON.stringify(locQueue))
    if((locQueue.length||sosQueue.length)&&!session.token){this.updateStatus('OFFLINE');return}

    if (locQueue.length === 0 && sosQueue.length === 0) {
      this.updateStatus('ONLINE')
      return
    }

    this.updateStatus('SYNCING')

    try {
      // 1. Flush Location Queue
      if (locQueue.length > 0) {
        const resp = await apiFetch('/api/labour/sync-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({ queued_points: locQueue })
        })
        if (resp.ok) {
          localStorage.removeItem(QUEUE_KEY)
        }
      }

      // 2. Flush SOS Queue
      if (sosQueue.length > 0) {
        for (const sos of sosQueue) {
          const response=await apiFetch('/api/emergency/sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
            body: JSON.stringify({
              workerId: sos.worker_id,
              mineLocation: sos.mine_id,
              coordinates: Number.isFinite(sos.latitude)&&Number.isFinite(sos.longitude)?{lat:sos.latitude,lng:sos.longitude}:undefined
            })
          })
          if(!response.ok) throw new Error('SOS did not reach the server')
        }
        localStorage.removeItem(SOS_QUEUE_KEY)
      }

      const syncTime = new Date().toLocaleTimeString()
      localStorage.setItem('mineguard_last_sync', syncTime)
      this.updateStatus('SYNC_COMPLETE')

      setTimeout(() => {
        this.updateStatus('ONLINE')
      }, 3000)

    } catch (err) {
      console.error('Offline sync failed:', err)
      this.updateStatus('OFFLINE')
    }
  }
}

export const offlineSyncEngine = new OfflineSyncEngine()
