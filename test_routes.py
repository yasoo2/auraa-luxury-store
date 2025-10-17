#!/usr/bin/env python3

import sys
import os
sys.path.append('/app/backend')

from server import app

print("All registered routes:")
for route in app.routes:
    if hasattr(route, 'path'):
        print(f"  {route.methods if hasattr(route, 'methods') else 'N/A'} {route.path}")
    elif hasattr(route, 'routes'):  # Sub-router
        print(f"Sub-router: {route}")
        for sub_route in route.routes:
            if hasattr(sub_route, 'path'):
                print(f"    {sub_route.methods if hasattr(sub_route, 'methods') else 'N/A'} {sub_route.path}")

print("\nLooking for super-admin routes:")
for route in app.routes:
    if hasattr(route, 'path') and 'super-admin' in route.path:
        print(f"  Found: {route.methods if hasattr(route, 'methods') else 'N/A'} {route.path}")
    elif hasattr(route, 'routes'):
        for sub_route in route.routes:
            if hasattr(sub_route, 'path') and 'super-admin' in sub_route.path:
                print(f"  Found in sub-router: {sub_route.methods if hasattr(sub_route, 'methods') else 'N/A'} {sub_route.path}")