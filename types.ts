export enum Role {
  OPERATOR = 'OPERARIO',
  LEADER = 'LÍDER MANTENIMIENTO',
  MANAGER = 'GERENCIA',
  SUPERVISOR = 'SUPERVISOR' // <--- NUEVO: Rol para Supervisor de Planta
}

export enum MaintenanceType {
  LIGHT = 'Liviano',
  HEAVY = 'Pesado'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  phone?: string;
  pin?: string; // <--- NUEVO: Campo para la contraseña del Supervisor/Operario
}

export interface Machine {
  id: string;
  name: string;
  assignedTo?: string; // User ID
  lastMaintenance: string; // ISO Date
  intervalDays: number;
}

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  userId: string;
  date: string;
  observations: string;
  type: MaintenanceType;
  isIssue: boolean;
  downtime?: number; // <--- Asegúrate de tener este también si usas tiempos de parada
}
