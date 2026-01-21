
export enum Role {
  OPERATOR = 'OPERARIO',
  LEADER = 'LÍDER MANTENIMIENTO',
  MANAGER = 'GERENCIA'
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
}
