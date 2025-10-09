#!/usr/bin/env python3
import json
import os
import glob

def check_json_files(directory):
    """Recursively find and validate all JSON files"""
    json_files = []
    for root, dirs, files in os.walk(directory):
        # Skip node_modules
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        for file in files:
            if file.endswith('.json'):
                json_files.append(os.path.join(root, file))
    
    valid_files = []
    invalid_files = []
    
    for json_file in json_files:
        try:
            with open(json_file, 'r') as f:
                json.load(f)
            valid_files.append(json_file)
        except Exception as e:
            invalid_files.append((json_file, str(e)))
    
    return valid_files, invalid_files

if __name__ == "__main__":
    print("=== JSON Validation Report ===")
    valid, invalid = check_json_files(".")
    
    print(f"✅ Valid JSON files: {len(valid)}")
    for f in valid:
        print(f"  - {f}")
    
    print(f"\n❌ Invalid JSON files: {len(invalid)}")
    for f, error in invalid:
        print(f"  - {f}: {error}")
    
    if len(invalid) == 0:
        print("\n🎉 All JSON files are valid!")
    else:
        print(f"\n⚠️  Found {len(invalid)} invalid JSON files that need fixing.")