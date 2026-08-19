# Invoicing Module

Owns invoice lifecycle, source-backed and manual line items, payments, totals, status history, and invoice rendering requests.

Invoice issuance and payment receipt emit idempotent accounting source events. Lines preserve immutable snapshots of their source data.
