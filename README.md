# VAT Invoice Generator

[Try the live demo](https://vat-invoice-generator-56u.pages.dev/?demo=1) to edit a fictional invoice. Use **Use my company details** to open your own separate workspace.

1. In **Details**, enter the seller, customer, invoice and delivery information. Upload a logo, choose a brand colour and select **Use for future invoices** to save a company profile.
2. In **Items**, enter quantities, net unit prices, discounts and the VAT rate for each line. The preview includes totals and the breakdown by VAT rate.
3. In **Payment**, add payment instructions, terms or an amount already received. The invoice shows the remaining balance.
4. Select **Save invoice** to keep an editable snapshot. Open **Saved invoices** to search by customer or invoice number, reopen a draft or duplicate it.
5. Select **Print / Save PDF**, then **Save as PDF** in the browser dialog. Keep a copy of each issued invoice. Check the invoice number against your business's sequence before issue.

Drafts, company details and saved invoices stay in the current browser. Download PDFs you need to keep before clearing browser data or moving devices. The app generates ordinary EUR VAT invoices. See [Revenue's VAT invoice guidance](https://www.revenue.ie/en/vat/vat-records-invoices-credit-notes/invoices/information-required-vat-invoice.aspx) for special schemes, reverse charge and foreign-currency requirements.

## Make it yours

Fork this repository and serve the `public` folder on static hosting. For Cloudflare Pages, choose no framework, leave the build command empty and set the output directory to `public`. To test locally, serve the `public` directory with a local web server.

The [original wholesale and retail demo](https://vat-invoice-generator-56u.pages.dev/classic/) runs the commercial invoice templates with fictional rows and separate browser storage.

The redesigned editor offers the original wholesale and retail template names, VAT-inclusive and net pricing, two brand images, an invoice history CSV, and a Gmail compose action. Save the PDF and attach it in Gmail before sending.
