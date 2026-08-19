# Shared Contracts

Owns cross-domain primitives only: IDs, money, currencies, dates, typed errors, pagination, audit metadata, source-event contracts, and transaction abstractions.

Shared code must not import a business module. Keep domain-specific policies in the owning module.
