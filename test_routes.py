#!/usr/bin/env python3

import sys
import os
sys.path.append('/app/backend')

from server import app

print("Looking for super-admin routes:")
super_admin_routes = []
for route in app.routes:
    if hasattr(route, 'path') and 'super-admin' in route.path:
        super_admin_routes.append(f"  {route.methods if hasattr(route, 'methods') else 'N/A'} {route.path}")
    elif hasattr(route, 'routes'):
        for sub_route in route.routes:
            if hasattr(sub_route, 'path') and 'super-admin' in sub_route.path:
                super_admin_routes.append(f"  {sub_route.methods if hasattr(sub_route, 'methods') else 'N/A'} {sub_route.path}")

if super_admin_routes:
    print("Found super-admin routes:")
    for route in super_admin_routes:
        print(route)
else:
    print("No super-admin routes found!")
    print("\nAll routes:")
    for route in app.routes:
        if hasattr(route, 'path'):
            print(f"  {route.methods if hasattr(route, 'methods') else 'N/A'} {route.path}")
        elif hasattr(route, 'routes'):
            for sub_route in route.routes:
                if hasattr(sub_route, 'path'):
                    print(f"    {sub_route.methods if hasattr(sub_route, 'methods') else 'N/A'} {sub_route.path}")