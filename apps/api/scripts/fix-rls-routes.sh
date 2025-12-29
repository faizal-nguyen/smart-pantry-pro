#!/bin/bash
# Script to fix RLS bypass in route files
# Applies the user-scoped client pattern to all routes

set -e

ROUTES_DIR="/Users/faizel/Documents/Mes documents/3_Dev/Projets/Smart Grocery/smart-pantry-pro/apps/api/src/routes"

echo "🔧 Fixing RLS bypass in route files..."

# Function to update a route file
update_route_file() {
  local file=$1
  local service_name=$2

  echo "  📝 Updating $file..."

  # Backup original
  cp "$file" "$file.backup"

  # 1. Update imports - add .js extensions
  sed -i '' "s|from '../services/${service_name}'|from '../services/${service_name}.js'|g" "$file"
  sed -i '' "s|from '../types/supabase'|from '../types/supabase.js'|g" "$file"

  # 2. Change function signature to use _adminClient
  sed -i '' "s|export function create.*Router(supabase: SupabaseClient<Database>)|export function create${service_name}Router(_adminClient: SupabaseClient<Database>)|g" "$file"

  # 3. Remove the global service instantiation (this is more complex, will handle manually)

  echo "  ✅ $file updated (manual review needed for service instantiation)"
}

# Update each route file
# update_route_file "$ROUTES_DIR/recipes.routes.ts" "Recipe"
# update_route_file "$ROUTES_DIR/shopping.routes.ts" "Shopping"
# update_route_file "$ROUTES_DIR/users.routes.ts" "User"

echo "⚠️  Manual step required:"
echo "   For each route handler, replace:"
echo "     const items = await service.method()"
echo "   with:"
echo "     const service = new Service(req.supabaseClient);"
echo "     const items = await service.method()"

echo "✅ Script completed"
