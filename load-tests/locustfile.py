"""
Load test for Nature Secret storefront (Next.js).

Run web UI (adjust host in the UI or use --host):
  cd load-tests && pip install -r requirements.txt
  locust -f locustfile.py --host https://naturesecret.pk

Then open http://localhost:8089 — start with 1 user, ramp to 100, watch failures/latency.

Headless example (no UI):
  locust -f locustfile.py --headless -u 50 -r 5 -t 2m --host https://naturesecret.pk

Use LOCUST_HOST to default the class host (optional; --host overrides for many setups):
  export LOCUST_HOST=http://localhost:3000
"""

import os

from locust import HttpUser, between, task


# Default local Next.js; set LOCUST_HOST=https://naturesecret.pk or pass --host for production tests.
DEFAULT_HOST = os.environ.get("LOCUST_HOST", "http://127.0.0.1:3000")


class StorefrontUser(HttpUser):
    """Simulates visitors browsing the public site."""

    host = DEFAULT_HOST
    wait_time = between(1, 3)

    @task(5)
    def home(self):
        self.client.get("/", name="GET /")

    @task(3)
    def shop(self):
        self.client.get("/shop", name="GET /shop")

    @task(2)
    def product_detail(self):
        self.client.get(
            "/shop/75e34e0a-65d5-4f9c-abfe-3e86fd2a9447",
            name="GET /shop/[product]",
        )

    @task(1)
    def contact(self):
        self.client.get("/contact", name="GET /contact")
