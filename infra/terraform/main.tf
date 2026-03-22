# infra/terraform/main.tf
# Provisions the Supabase project and configures Cognito third-party auth.
# Run: terraform init && terraform apply

terraform {
  required_version = ">= 1.5"

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

provider "supabase" {
  access_token = var.supabase_access_token
}

# ── Supabase project ─────────────────────────────────────────

resource "supabase_project" "crypto_tracker" {
  organization_id   = var.supabase_org_id
  name              = "crypto-tx-tracker"
  database_password  = var.supabase_db_password
  region            = "eu-west-2"
}

# ── Cognito third-party auth ─────────────────────────────────

resource "supabase_settings" "auth" {
  project_ref = supabase_project.crypto_tracker.id

  auth = jsonencode({
    third_party = {
      aws_cognito = {
        enabled          = true
        user_pool_id     = "eu-west-2_vLIzAhvnA"
        user_pool_region = "eu-west-2"
      }
    }
  })
}

# ── Look up API keys after project creation ──────────────────

data "supabase_apikeys" "keys" {
  project_ref = supabase_project.crypto_tracker.id
}

# ── Outputs ───────────────────────────────────────────────────

output "project_ref" {
  description = "Supabase project reference ID"
  value       = supabase_project.crypto_tracker.id
}

output "project_url" {
  description = "Supabase project API URL"
  value       = "https://${supabase_project.crypto_tracker.id}.supabase.co"
}

output "anon_key" {
  description = "Supabase anon (public) API key"
  value       = data.supabase_apikeys.keys.anon_key
  sensitive   = true
}
