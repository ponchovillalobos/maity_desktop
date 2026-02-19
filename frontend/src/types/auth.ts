export interface MaityUser {
  id: string
  auth_id: string
  first_name: string
  last_name: string | null
  email: string | null
  status: string
  created_at: string | null
  updated_at: string
}
