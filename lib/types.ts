export type TipoTicket = 'Bug' | 'Task' | 'Support'
export type Urgencia = 'Low' | 'Medium' | 'High'

export interface TicketRequest {
  cliente: string
  asunto: string
  descripcion: string
  tipo: TipoTicket
  urgencia: Urgencia
  contacto?: string
  dueDate?: string // Fecha de vencimiento en formato ISO (YYYY-MM-DD)
  archivos?: File[] // Archivos para adjuntar al ticket
}

export interface TicketResponse {
  success: boolean
  issueKey?: string
  issueUrl?: string
  error?: string
}

export interface JiraProject {
  key: string
  name: string
}

export interface FormErrors {
  cliente?: string
  asunto?: string
  descripcion?: string
  tipo?: string
  urgencia?: string
  contacto?: string
  dueDate?: string
  archivos?: string
}
