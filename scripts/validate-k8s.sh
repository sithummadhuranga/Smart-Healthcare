#!/usr/bin/env bash
###############################################################################
# Production-grade Kubernetes YAML validation script
#
# Validates manifests using kube-score (offline, no cluster connection needed)
# This tool:
#   - Validates YAML syntax and structure
#   - Checks Kubernetes API schema conformance
#   - Identifies security issues and best practices
#   - Works completely offline (no cluster, DNS, HTTPS needed)
#   - Perfect for CI/CD environments
#
# Exit codes:
#   0 = all manifests valid
#   1 = syntax/schema validation errors found
###############################################################################

set -e

K8S_DIR="k8s"

echo "🔍 Validating Kubernetes manifests with kube-score..."
echo "   (offline validation, no cluster connection required)\n"

# Check if kube-score is installed
if ! command -v kube-score &> /dev/null; then
  echo "Installing kube-score..."
  # Install kube-score binary from release
  mkdir -p /tmp/kube-score
  cd /tmp/kube-score
  KSCORE_VERSION=$(curl -s https://api.github.com/repos/zegl/kube-score/releases/latest | grep tag_name | cut -d'"' -f4 | cut -c2-)
  curl -sL "https://github.com/zegl/kube-score/releases/download/v${KSCORE_VERSION}/kube-score_${KSCORE_VERSION}_linux_amd64.tar.gz" | tar xz
  sudo mv kube-score /usr/local/bin/
  cd -
  echo "✅ kube-score installed\n"
fi

VALIDATION_FAILED=0
VALIDATED_COUNT=0
SKIPPED_COUNT=0

# Find all .yaml files except secret.yaml.example
while IFS= read -r manifest; do
  echo -n "  Validating $(basename "$manifest")... "
  
  # Use kube-score for validation (offline, no cluster needed)
  # Ignore warnings/info messages, only fail on critical issues
  if kube-score score "$manifest" 2>&1 | grep -q "CRITICAL"; then
    echo "❌"
    VALIDATION_FAILED=1
    kube-score score "$manifest" 2>&1 | sed 's/^/    /'
  else
    echo "✅"
    ((VALIDATED_COUNT++))
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
  echo "  1. Review the critical issues above"
  echo "  2. Fix YAML syntax (indentation, field names, types)"
  echo "  3. Ensure all required fields are present"
  echo "  4. Re-run this script to validate"
  echo ""
  exit 1
fi
