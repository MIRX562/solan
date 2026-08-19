# Accounting Module

Owns the chart of accounts, journal entries, journal lines, expenses, posting source events, and financial reports.

Every posting command runs transactionally, creates balanced debit/credit lines, and is idempotent by source-event key.
