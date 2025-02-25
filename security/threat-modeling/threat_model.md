# Threat Model for FPBE Mobile Banking

## Overview
This document outlines the potential threats to the FPBE Mobile Banking application, including attack vectors and mitigation strategies.

## Identified Threats
1. **Unauthorized Access**
   - **Description**: Attackers gain unauthorized access to user accounts.
   - **Mitigation**: Implement multi-factor authentication (MFA) and strong password policies.

2. **Data Breach**
   - **Description**: Sensitive user data is exposed due to vulnerabilities.
   - **Mitigation**: Use encryption for data at rest and in transit.

3. **Denial of Service (DoS)**
   - **Description**: Attackers overwhelm the service, making it unavailable.
   - **Mitigation**: Implement rate limiting and DDoS protection.

## Threat Matrix
- See `threat_matrix.json` for a detailed representation of threats and their impact.
