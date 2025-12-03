import { JiraProject } from '@/lib/types'

export const JIRA_PROJECTS: Record<string, JiraProject> = {
  'goodyear': { key: 'GB', name: 'Goodyear Brasil' },
  'modelo': { key: 'DM', name: 'Modelo Adobe' },
  'adobe-suite': { key: 'IAS', name: 'Infracommerce Adobe Suite' }, // Key actualizada de SFS a IAS
  'hiraoka': { key: 'HIR', name: 'HIRAOKA' } // Key del proyecto en Jira: HIR (verificado en https://infracommerce.atlassian.net/jira/software/c/projects/HIR/boards/480)
} as const

export const CLIENTES = Object.entries(JIRA_PROJECTS).map(([id, project]) => ({
  id,
  name: project.name
}))

export const TIPOS_TICKET = [
  { value: 'Bug', label: 'Bug / Error' },
  { value: 'Task', label: 'Tarea' },
  { value: 'Support', label: 'Soporte' }
] as const

export const URGENCIAS = [
  { value: 'Low', label: 'Baja' },
  { value: 'Medium', label: 'Media' },
  { value: 'High', label: 'Alta' }
] as const
