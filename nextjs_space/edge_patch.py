from pathlib import Path
p = Path("/docker/traefik/dynamic/traefik-dynamic.yml")
text = p.read_text()
old = """    # phipi.me — admin/login are protected by the app itself (NextAuth)
    phipi-me-admin:
      rule: "(Host(`phipi.me`) || Host(`www.phipi.me`)) && (PathPrefix(`/admin`) || PathPrefix(`/auth/login`))"
      priority: 100
      service: phipi-me
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - security-headers
        - tailscale-whitelist
      ruleSyntax: v3

    # phipi.me — full site via tailnet hostname (Tailscale-only)
    phipi-me-tailnet:
      rule: "Host(`jennifer.kitty-city.ts.net`) || Host(`jennifer`) || Host(`localhost`)"
      service: phipi-me
      entryPoints:
        - websecure
      tls:
        options: default
      middlewares:
        - security-headers
"""
new = """    # phipi.me — full site via tailnet hostname (Tailscale-only)
    phipi-me-tailnet:
      rule: "Host(`jennifer.kitty-city.ts.net`) || Host(`jennifer`) || Host(`localhost`)"
      service: phipi-me
      entryPoints:
        - websecure
      tls:
        options: default
      middlewares:
        - security-headers
"""
if old not in text:
    raise SystemExit('old block not found')
p.write_text(text.replace(old, new))
print('patched')
