---
title: Header Handling
---

# Header Handling

## Request ID Tracking

Appium supports setting the request ID for each request through the `x-request-id` header. This is useful for tracing requests through your system, especially in environments where multiple services are involved or when debugging across different requests.

### Using `x-request-id`

When making requests to Appium, you can include an `x-request-id` header with a unique identifier. This ID will be:

- Used to track the request through Appium's logging system
- Preserved across the entire request lifecycle
- Generated automatically (as a UUID) if not provided
