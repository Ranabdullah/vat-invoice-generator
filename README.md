# VAT Invoice Generator

Enter your business and customer details, upload a logo and set the invoice heading. Add lines with quantities, net unit prices, discounts and their VAT rates. The preview shows VAT by rate and the amount due. Select **Print / Save PDF** and choose **Save as PDF** in your browser.

**Load example** opens a fictional invoice. Drafts stay in browser storage. Save each issued PDF separately. **New invoice** keeps your business branding and advances a trailing invoice number. Confirm the number against your own sequence before issuing.

The app produces ordinary EUR VAT invoices. Consult [Revenue's VAT invoice guidance](https://www.revenue.ie/en/vat/vat-records-invoices-credit-notes/invoices/information-required-vat-invoice.aspx) for requirements such as special schemes, reverse charge and foreign currencies.

## Make it yours

Fork this repository and serve the `public` folder on static hosting. For Cloudflare Pages, choose no framework, leave the build command empty and set the output directory to `public`. To test locally, open `public/index.html` in a browser.
