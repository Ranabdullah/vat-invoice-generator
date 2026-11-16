# VAT Invoice Generator

Enter your business and customer details, upload a logo and set the invoice heading. Add lines with quantities, net unit prices, discounts and their VAT rates. The preview shows VAT by rate and the amount due. Select **Print / Save PDF** and choose **Save as PDF** in your browser.

The [live demo](https://vat-invoice-generator-56u.pages.dev/?demo=1) opens a fictional invoice ready to edit, print or save as a PDF. **Open my invoice workspace** switches to a separate draft, initially empty. Both drafts stay in browser storage.

**New invoice** keeps your branding and advances a trailing invoice number. Confirm the number against your own sequence before issuing and save each issued PDF separately.

The app produces ordinary EUR VAT invoices. Consult [Revenue's VAT invoice guidance](https://www.revenue.ie/en/vat/vat-records-invoices-credit-notes/invoices/information-required-vat-invoice.aspx) for requirements such as special schemes, reverse charge and foreign currencies.

## Make it yours

Fork this repository and serve the `public` folder on static hosting. For Cloudflare Pages, choose no framework, leave the build command empty and set the output directory to `public`. To test locally, open `public/index.html` in a browser.
