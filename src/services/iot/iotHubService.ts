/**
 * IoT Hub Service - Evolution V2
 * Smart kitchen device integration and management
 */

export interface SmartDevice {
  id: string;
  userId: string;
  name: string;
  type: 'fridge' | 'oven' | 'scale' | 'thermometer' | 'timer' | 'sensor' | 'camera' | 'display';
  brand: string;
  model: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress?: string;
  status: 'online' | 'offline' | 'error' | 'updating';
  lastSeen: Date;
  batteryLevel?: number;
  capabilities: DeviceCapability[];
  settings: Record<string, any>;
  location: {
    room: string;
    position?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceCapability {
  name: string;
  type: 'sensor' | 'actuator' | 'display' | 'storage';
  dataType: 'number' | 'string' | 'boolean' | 'object' | 'array';
  unit?: string;
  range?: { min: number; max: number };
  precision?: number;
  readOnly: boolean;
}

export interface SmartFridgeData {
  temperature: {
    main: number;
    freezer: number;
    vegetableDrawer: number;
  };
  humidity: number;
  doorStatus: 'open' | 'closed';
  energyUsage: number; // kWh
  inventory: FridgeInventoryItem[];
  alerts: FridgeAlert[];
  lastUpdated: Date;
}

export interface FridgeInventoryItem {
  id: string;
  productName: string;
  barcode?: string;
  quantity: number;
  unit: string;
  location: 'main' | 'freezer' | 'drawer' | 'door';
  expiryDate?: Date;
  addedAt: Date;
  imageUrl?: string;
  confidence: number; // AI recognition confidence
}

export interface FridgeAlert {
  id: string;
  type: 'expiry_warning' | 'temperature_alert' | 'door_open' | 'power_outage' | 'maintenance';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  productId?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface SmartOvenData {
  temperature: {
    internal: number;
    setpoint: number;
  };
  mode: 'off' | 'preheating' | 'cooking' | 'cooling' | 'cleaning';
  program: {
    name: string;
    remainingTime: number; // minutes
    totalTime: number;
  };
  doorStatus: 'open' | 'closed' | 'locked';
  energyUsage: number;
  presets: OvenPreset[];
  lastUpdated: Date;
}

export interface OvenPreset {
  id: string;
  name: string;
  temperature: number;
  duration: number;
  mode: 'bake' | 'broil' | 'convection' | 'steam' | 'combination';
  humidity?: number;
  stages?: OvenStage[];
}

export interface OvenStage {
  temperature: number;
  duration: number;
  mode: string;
  humidity?: number;
}

export interface SmartScaleData {
  weight: number; // grams
  unit: 'g' | 'kg' | 'oz' | 'lb';
  tare: number;
  isStable: boolean;
  batteryLevel: number;
  calibrationDate: Date;
  measurements: ScaleMeasurement[];
  lastUpdated: Date;
}

export interface ScaleMeasurement {
  id: string;
  weight: number;
  unit: string;
  productName?: string;
  timestamp: Date;
  userId: string;
  recipeId?: string; // If measuring for a recipe
}

export interface SmartSensorData {
  sensorId: string;
  type: 'temperature' | 'humidity' | 'air_quality' | 'smoke' | 'motion' | 'light';
  value: number;
  unit: string;
  timestamp: Date;
  location: string;
  alerts: SensorAlert[];
}

export interface SensorAlert {
  id: string;
  threshold: number;
  comparison: 'above' | 'below' | 'equal';
  message: string;
  isActive: boolean;
}

export interface DeviceAutomation {
  id: string;
  name: string;
  userId: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  lastTriggered?: Date;
  executionCount: number;
  createdAt: Date;
}

export interface AutomationTrigger {
  type: 'device_event' | 'time' | 'location' | 'recipe_start' | 'inventory_change';
  deviceId?: string;
  event?: string;
  schedule?: string; // cron expression
  value?: any;
}

export interface AutomationCondition {
  deviceId: string;
  property: string;
  operator: 'equals' | 'greater' | 'less' | 'contains';
  value: any;
}

export interface AutomationAction {
  deviceId: string;
  command: string;
  parameters?: Record<string, any>;
  delay?: number; // seconds
}

export interface CookingSession {
  id: string;
  userId: string;
  recipeId: string;
  recipeName: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  devices: CookingSessionDevice[];
  steps: CookingStep[];
  alerts: SessionAlert[];
  actualIngredients: SessionIngredient[];
  notes?: string;
}

export interface CookingSessionDevice {
  deviceId: string;
  deviceType: string;
  role: 'primary' | 'secondary' | 'monitoring';
  startTime: Date;
  endTime?: Date;
  commands: DeviceCommand[];
}

export interface DeviceCommand {
  id: string;
  command: string;
  parameters: Record<string, any>;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
}

export interface CookingStep {
  id: string;
  stepNumber: number;
  description: string;
  duration: number;
  temperature?: number;
  devicesInvolved: string[];
  startTime?: Date;
  completedTime?: Date;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  automatedActions: string[];
}

export interface SessionAlert {
  id: string;
  type: 'timer' | 'temperature' | 'step_completion' | 'device_error' | 'safety';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
  deviceId?: string;
}

export interface SessionIngredient {
  name: string;
  measuredWeight: number;
  requiredWeight: number;
  unit: string;
  variance: number;
  timestamp: Date;
}

export class IoTHubService {
  private wsConnection: WebSocket | null = null;
  private deviceCache = new Map<string, SmartDevice>();
  private subscriptions = new Set<string>();
  private eventHandlers = new Map<string, Function[]>();
  private apiUrl: string;
  private authToken?: string;

  constructor(apiUrl: string, authToken?: string) {
    this.apiUrl = apiUrl;
    this.authToken = authToken;
  }

  /**
   * Device Discovery and Management
   */
  async discoverDevices(): Promise<SmartDevice[]> {
    try {
      const response = await this.request('GET', '/iot/devices/discover');
      return response.devices;
    } catch (error) {
      console.error('Device discovery failed:', error);
      return [];
    }
  }

  async getDevices(): Promise<SmartDevice[]> {
    try {
      const response = await this.request('GET', '/iot/devices');
      const devices = response.devices;
      
      // Update cache
      devices.forEach((device: SmartDevice) => {
        this.deviceCache.set(device.id, device);
      });
      
      return devices;
    } catch (error) {
      console.error('Failed to get devices:', error);
      return Array.from(this.deviceCache.values());
    }
  }

  async addDevice(deviceInfo: Partial<SmartDevice>): Promise<SmartDevice> {
    const response = await this.request('POST', '/iot/devices', deviceInfo);
    const device = response.device;
    this.deviceCache.set(device.id, device);
    return device;
  }

  async removeDevice(deviceId: string): Promise<void> {
    await this.request('DELETE', `/iot/devices/${deviceId}`);
    this.deviceCache.delete(deviceId);
  }

  async updateDevice(deviceId: string, updates: Partial<SmartDevice>): Promise<SmartDevice> {
    const response = await this.request('PUT', `/iot/devices/${deviceId}`, updates);
    const device = response.device;
    this.deviceCache.set(deviceId, device);
    return device;
  }

  /**
   * Device Data Retrieval
   */
  async getFridgeData(deviceId: string): Promise<SmartFridgeData> {
    const response = await this.request('GET', `/iot/devices/${deviceId}/fridge-data`);
    return response.data;
  }

  async getOvenData(deviceId: string): Promise<SmartOvenData> {
    const response = await this.request('GET', `/iot/devices/${deviceId}/oven-data`);
    return response.data;
  }

  async getScaleData(deviceId: string): Promise<SmartScaleData> {
    const response = await this.request('GET', `/iot/devices/${deviceId}/scale-data`);
    return response.data;
  }

  async getSensorData(deviceId: string, timeRange?: { start: Date; end: Date }): Promise<SmartSensorData[]> {
    const params = timeRange ? 
      `?start=${timeRange.start.toISOString()}&end=${timeRange.end.toISOString()}` : '';
    
    const response = await this.request('GET', `/iot/devices/${deviceId}/sensor-data${params}`);
    return response.data;
  }

  /**
   * Device Control
   */
  async controlDevice(deviceId: string, command: string, parameters?: Record<string, any>): Promise<any> {
    const response = await this.request('POST', `/iot/devices/${deviceId}/control`, {
      command,
      parameters
    });
    return response.result;
  }

  async presetOven(deviceId: string, presetId: string): Promise<void> {
    await this.controlDevice(deviceId, 'use_preset', { presetId });
  }

  async startCooking(deviceId: string, temperature: number, duration: number, mode: string): Promise<void> {
    await this.controlDevice(deviceId, 'start_cooking', {
      temperature,
      duration,
      mode
    });
  }

  async tareScale(deviceId: string): Promise<void> {
    await this.controlDevice(deviceId, 'tare');
  }

  async setFridgeTemperature(deviceId: string, compartment: string, temperature: number): Promise<void> {
    await this.controlDevice(deviceId, 'set_temperature', {
      compartment,
      temperature
    });
  }

  /**
   * Automated Inventory Updates
   */
  async syncFridgeInventory(deviceId: string): Promise<FridgeInventoryItem[]> {
    const response = await this.request('POST', `/iot/devices/${deviceId}/sync-inventory`);
    return response.inventory;
  }

  async updateInventoryFromScale(deviceId: string, productName: string, weight: number): Promise<void> {
    await this.request('POST', `/iot/devices/${deviceId}/inventory-update`, {
      productName,
      weight,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Cooking Session Management
   */
  async startCookingSession(recipeId: string, selectedDevices: string[]): Promise<CookingSession> {
    const response = await this.request('POST', '/iot/cooking-sessions', {
      recipeId,
      deviceIds: selectedDevices,
      startTime: new Date().toISOString()
    });
    return response.session;
  }

  async updateCookingSession(sessionId: string, updates: Partial<CookingSession>): Promise<CookingSession> {
    const response = await this.request('PUT', `/iot/cooking-sessions/${sessionId}`, updates);
    return response.session;
  }

  async completeCookingSession(sessionId: string, notes?: string): Promise<void> {
    await this.request('POST', `/iot/cooking-sessions/${sessionId}/complete`, { 
      endTime: new Date().toISOString(),
      notes 
    });
  }

  async getActiveCookingSessions(): Promise<CookingSession[]> {
    const response = await this.request('GET', '/iot/cooking-sessions/active');
    return response.sessions;
  }

  /**
   * Automation Management
   */
  async createAutomation(automation: Omit<DeviceAutomation, 'id' | 'createdAt' | 'executionCount' | 'lastTriggered'>): Promise<DeviceAutomation> {
    const response = await this.request('POST', '/iot/automations', automation);
    return response.automation;
  }

  async getAutomations(): Promise<DeviceAutomation[]> {
    const response = await this.request('GET', '/iot/automations');
    return response.automations;
  }

  async toggleAutomation(automationId: string, isActive: boolean): Promise<void> {
    await this.request('PUT', `/iot/automations/${automationId}`, { isActive });
  }

  async deleteAutomation(automationId: string): Promise<void> {
    await this.request('DELETE', `/iot/automations/${automationId}`);
  }

  /**
   * Real-time Communication
   */
  connectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
    }

    const wsUrl = this.apiUrl.replace('http', 'ws') + '/iot/websocket';
    this.wsConnection = new WebSocket(wsUrl);

    this.wsConnection.onopen = () => {
      console.log('IoT WebSocket connected');
      
      // Authenticate
      if (this.authToken) {
        this.sendMessage('auth', { token: this.authToken });
      }
      
      // Re-subscribe to previous subscriptions
      this.subscriptions.forEach(subscription => {
        this.sendMessage('subscribe', { topic: subscription });
      });
    };

    this.wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.wsConnection.onclose = () => {
      console.log('IoT WebSocket disconnected');
      // Auto-reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }

  subscribeToDevice(deviceId: string): void {
    const topic = `device/${deviceId}`;
    this.subscriptions.add(topic);
    
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.sendMessage('subscribe', { topic });
    }
  }

  unsubscribeFromDevice(deviceId: string): void {
    const topic = `device/${deviceId}`;
    this.subscriptions.delete(topic);
    
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.sendMessage('unsubscribe', { topic });
    }
  }

  subscribeToAutomations(): void {
    const topic = 'automations';
    this.subscriptions.add(topic);
    
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.sendMessage('subscribe', { topic });
    }
  }

  subscribeToCookingSessions(): void {
    const topic = 'cooking-sessions';
    this.subscriptions.add(topic);
    
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.sendMessage('subscribe', { topic });
    }
  }

  /**
   * Event Handling
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: Function): void {
    if (!handler) {
      this.eventHandlers.delete(event);
    } else {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      });
    }
  }

  /**
   * Private Helper Methods
   */
  private sendMessage(type: string, payload: any): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({ type, payload }));
    }
  }

  private handleWebSocketMessage(message: any): void {
    const { type, payload } = message;

    switch (type) {
      case 'device_update':
        this.deviceCache.set(payload.deviceId, payload.device);
        this.emit('deviceUpdate', payload);
        break;
        
      case 'device_alert':
        this.emit('deviceAlert', payload);
        break;
        
      case 'automation_triggered':
        this.emit('automationTriggered', payload);
        break;
        
      case 'cooking_session_update':
        this.emit('cookingSessionUpdate', payload);
        break;
        
      case 'inventory_changed':
        this.emit('inventoryChanged', payload);
        break;
        
      default:
        console.log('Unhandled WebSocket message type:', type);
    }
  }

  private async request(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`IoT API Error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Utility Methods
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    
    // Update WebSocket authentication if connected
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.sendMessage('auth', { token });
    }
  }

  clearAuthToken(): void {
    this.authToken = undefined;
  }

  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.subscriptions.clear();
    this.eventHandlers.clear();
    this.deviceCache.clear();
  }

  getDeviceFromCache(deviceId: string): SmartDevice | undefined {
    return this.deviceCache.get(deviceId);
  }

  isDeviceOnline(deviceId: string): boolean {
    const device = this.deviceCache.get(deviceId);
    return device?.status === 'online';
  }

  getDevicesByType(deviceType: SmartDevice['type']): SmartDevice[] {
    return Array.from(this.deviceCache.values())
      .filter(device => device.type === deviceType);
  }
}

// Export singleton instance
let iotHubInstance: IoTHubService | null = null;

export function getIoTHubService(apiUrl?: string, authToken?: string): IoTHubService {
  const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  if (!iotHubInstance) {
    iotHubInstance = new IoTHubService(apiUrl || defaultApiUrl, authToken);
  }
  
  // Update auth token if provided
  if (authToken) {
    iotHubInstance.setAuthToken(authToken);
  }
  
  return iotHubInstance;
}