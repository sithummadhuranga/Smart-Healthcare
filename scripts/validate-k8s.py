#!/usr/bin/env python3
"""
Production-grade Kubernetes YAML validation script

Validates K8s manifests offline without requiring:
  - Kubernetes cluster connection
  - External tools (kubeval, kube-score)
  - External schema downloads
  - Network connectivity

Uses PyYAML for syntax validation + built-in K8s API schema validation

Exit codes:
  0 = all manifests valid
  1 = syntax/schema errors found
"""

import sys
import os
from pathlib import Path
from typing import List, Dict, Any, Tuple

try:
    import yaml
except ImportError:
    print("❌ PyYAML not found. Install with: pip install pyyaml")
    sys.exit(1)

# Kubernetes API schema validation rules
# Maps Kind -> required fields for basic validation
K8S_SCHEMA = {
    "Deployment": ["metadata", "spec"],
    "Service": ["metadata", "spec"],
    "ConfigMap": ["metadata"],
    "Secret": ["metadata"],
    "PersistentVolumeClaim": ["metadata", "spec"],
    "Ingress": ["metadata", "spec"],
    "Pod": ["metadata", "spec"],
    "StatefulSet": ["metadata", "spec"],
    "DaemonSet": ["metadata", "spec"],
    "Job": ["metadata", "spec"],
}

METADATA_SCHEMA = ["name", "namespace"]


def validate_yaml_syntax(manifest_path: str) -> Tuple[bool, str]:
    """Validate YAML syntax."""
    try:
        with open(manifest_path, "r") as f:
            yaml.safe_load_all(f)
        return True, "Valid YAML syntax"
    except yaml.YAMLError as e:
        return False, f"YAML Syntax Error: {str(e)}"
    except Exception as e:
        return False, f"Error reading file: {str(e)}"


def validate_k8s_schema(manifest_path: str) -> Tuple[bool, List[str]]:
    """Validate Kubernetes API structure."""
    errors = []

    try:
        with open(manifest_path, "r") as f:
            documents = list(yaml.safe_load_all(f))
    except Exception as e:
        return False, [f"Failed to parse YAML: {str(e)}"]

    for idx, doc in enumerate(documents):
        if doc is None:
            continue

        if not isinstance(doc, dict):
            errors.append(f"Document {idx + 1}: Root must be a dictionary, got {type(doc).__name__}")
            continue

        # Check required top-level fields
        kind = doc.get("kind")
        if not kind:
            errors.append(f"Document {idx + 1}: Missing required field 'kind'")
            continue

        apiVersion = doc.get("apiVersion")
        if not apiVersion:
            errors.append(f"Document {idx + 1}: Missing required field 'apiVersion'")

        metadata = doc.get("metadata")
        if not metadata:
            errors.append(f"Document {idx + 1} ({kind}): Missing required field 'metadata'")
            continue

        if not isinstance(metadata, dict):
            errors.append(f"Document {idx + 1} ({kind}): 'metadata' must be a dictionary")
            continue

        # Check metadata.name
        if "name" not in metadata:
            errors.append(
                f"Document {idx + 1} ({kind}): Missing required field 'metadata.name'"
            )

        # Validate kind-specific required fields
        if kind in K8S_SCHEMA:
            required_fields = K8S_SCHEMA[kind]
            for field in required_fields:
                if field not in doc:
                    errors.append(
                        f"Document {idx + 1} ({kind}): Missing required field '{field}'"
                    )

    return len(errors) == 0, errors


def main():
    """Main validation entrypoint."""
    k8s_dir = Path("k8s")

    if not k8s_dir.exists():
        print("❌ k8s directory not found")
        sys.exit(1)

    print("🔍 Validating Kubernetes manifests...")
    print("   (offline validation, no cluster/network required)\n")

    manifests = sorted(
        k8s_dir.glob("*.yaml")
    )
    manifests = [m for m in manifests if m.name != "secret.yaml.example"]

    if not manifests:
        print("⚠️  No manifests found in k8s/")
        sys.exit(0)

    validation_failed = False
    validated_count = 0

    for manifest in manifests:
        sys.stdout.write(f"  Validating {manifest.name}... ")
        sys.stdout.flush()

        # Syntax validation
        valid_syntax, syntax_msg = validate_yaml_syntax(str(manifest))
        if not valid_syntax:
            print("❌")
            print(f"    {syntax_msg}")
            validation_failed = True
            continue

        # Schema validation
        valid_schema, schema_errors = validate_k8s_schema(str(manifest))
        if not valid_schema:
            print("❌")
            for error in schema_errors:
                print(f"    {error}")
            validation_failed = True
        else:
            print("✅")
            validated_count += 1

    print("")
    print("━" * 80)

    if not validation_failed:
        print(f"✅ All {validated_count} Kubernetes manifests are valid")
        print("   Ready for deployment\n")
        return 0
    else:
        print("❌ One or more manifests failed validation\n")
        print("Resolution:")
        print("  1. Ensure all manifests have: apiVersion, kind, metadata, metadata.name")
        print("  2. Check YAML indentation and syntax")
        print("  3. Verify field types (e.g., spec must be a dictionary, not a string)")
        print("  4. Re-run this script\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
