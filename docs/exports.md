# Export System

Pryntis supports multiple export formats for data portability and reporting.

## CSV Export

Available on most list pages via the "Export CSV" button.

### Supported Entities
- Artists
- Projects
- Assets
- Placements
- Tasks
- Contacts
- Templates
- Analytics data

### API
```
GET /api/v1/export/:entity
```

Returns a CSV file with `Content-Type: text/csv` and `Content-Disposition: attachment` headers. Fields are properly escaped per RFC 4180.

## PDF Export

### Template PDFs

Export any template (agreements, checklists, SOPs) as a professionally formatted PDF.

```
GET /api/v1/pdf/templates/:id/export.pdf
```

PDF includes:
- Template title (24pt bold)
- Category badge
- Full body text with preserved formatting
- Generated timestamp and Pryntis branding footer

### Royalty Statement PDFs

Export artist royalty statements as PDF documents.

```
GET /api/v1/pdf/royalty/statements/:artistId.pdf?period=YYYY-Qn
```

PDF includes:
- Artist header with statement period
- Revenue table (date, description, amount)
- Expenses table (category, description, amount)
- Summary totals: Gross Revenue, Total Expenses, Net Payable
- Professional formatting with Pryntis branding

### RBAC

- CSV export: any authenticated user
- Template PDF: any authenticated user
- Royalty statement PDF: admin, owner, manager only

## Technology

- CSV: Custom server-side generation with proper escaping
- PDF: PDFKit (pdfkit npm package) for server-side generation
