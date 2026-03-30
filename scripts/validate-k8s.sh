#!/usr/bin/env bash
###############################################################################
# Production-grade Kubernetes YAML validation script
#
# Uses kubectl's built-in schema validation (no external URL dependencies)
# instead of kubeval which has SSL certificate issues with external schemas.
#
# kubectl apply --dry-run=client automatically:
#   - Uses embedded OpenAPI schemas matching the kubectl version
#   - Validates YAML syntax and structure
#   - Checks against the target Kubernetes API version
#   - Works completely offline
#
# Exit codes:
#   0 = all manifests valid
#   1 = syntax/schema validation errors found
###############################################################################

set -e

K8S_DIR="k8s"
KUBECTL_VERSION=$(kubectl version --client -o json | grep -o '"gitVersion":"v[^"]*"' | cut -d'"' -f4)

echo "🔍 Validating Kubernetes manifests with kubectl ${KUBECTL_VERSION}..."
echo "Using schema validation from kubectl client (no external URLs)\n"

VALIDATION_FAILED=0
VALIDATED_COUNT=0

# Find all .yaml files except secret.yaml.example
while IFS= read -r manifest; do
  echo -n "  Validating $(basename "$manifest")... "
  
  # Use kubectl apply --dry-run=client for validation
  # This uses embedded OpenAPI schemas and catches:
  #   - YAML syntax errors
  #   - Unknown fields
  #   - Type mismatches
  #   - Invalid resource configurations
  if kubectl apply -f "$manifest" --dry-run=client -o yaml > /dev/null 2>&1; then
    echo "✅"
    ((VALIDATED_COUNT++))
  else
    echo "❌"
    VALIDATION_FAILED=1
    kubectl apply -f "$manifest" --dry-run=client 2>&1 | sed 's/^/    /'
  fi
done < <(find "$K8S_DIR" -name "*.yaml" ! -name "secret.yaml.example" | sort)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $VALIDATION_FAILED -eq 0 ]; then
  echo "✅ All $VALIDATED_COUNT Kubernetes manifests are valid and ready for deployment"
  echo ""
  exit 0
else
  echo "❌ One or more manifests failed validation"
  echo ""
  echo "Resolution:"
  echo "  1. Review the errors above"
  echo "  2. Fix YAML syntax errors (indentation, quotes, field names)"
  echo "  3. For API version issues, verify the target Kubernetes version"
  echo "  4. Re-run this script to validate"
  echo ""
  exit 1
fi
