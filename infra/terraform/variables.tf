# infra/terraform/variables.tf
# Input variables for the Supabase Terraform configuration.
# Sensitive values go in terraform.tfvars (gitignored).

variable "supabase_access_token" {
  description = "Supabase personal access token (generate at supabase.com/dashboard/account/tokens)"
  type        = string
  sensitive   = true
}

variable "supabase_org_id" {
  description = "Supabase organisation ID (visible in the dashboard URL)"
  type        = string
}

variable "supabase_db_password" {
  description = "Password for the Supabase Postgres database"
  type        = string
  sensitive   = true
}
