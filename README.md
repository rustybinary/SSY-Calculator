# SSY Calculator

A single-page calculator for India's **Sukanya Samriddhi Yojana** (SSY) savings scheme. It follows the scheme's own interest rules, so the maturity figure can be checked against a passbook.

**Live:** <https://rustybinary.github.io/SSY-Calculator/>

No build step, no dependencies, no tracking. Open `index.html` in a browser.

## What it does

- **Scheme-accurate interest.** Each calendar month earns interest on the lowest balance held between the close of the 5th and the end of the month, at that month's quarterly rate divided by 12. Interest is credited on 31 March each year, rounded to the nearest rupee, and compounds annually.
- **Notified rates built in.** Quarterly rates from December 2014 to December 2026 are hardcoded. Only the quarters inside the account's own period are shown.
- **Your own rates.** Choose between two modes. *Notified rates, then my assumption* uses the real rates up to the latest notification, then one assumed rate plus any expected rate changes ("from Jan–Mar 2029 the rate is 7%"). *One flat rate for everything* applies a single average rate such as 7% or 7.5% to every quarter, for what-if runs. Only the controls for the chosen mode are shown, and your expected changes are kept if you switch back.
- **Flexible deposits.** Once a year or every month, a default amount and date, per-year overrides, and extra one-off deposits on any date. The ₹1,50,000 yearly limit and the 15-year deposit window are applied, with switches for the edge cases.
- **Results.** Total deposited, total interest earned, total maturity amount, XIRR, net ROI, maturity date, a hoverable growth chart, and a year-by-year ledger where each year expands to its monthly workings.
- **Inputs.** Girl's date of birth, account opening date, contribution duration (up to 15 years), deposit amounts and dates.

## Run it

```sh
open index.html          # macOS; or just double-click the file
```

Fonts load from Google Fonts. If you are offline the page falls back to system fonts.

## Test it

The calculation core lives inside `index.html` between the `// <core>` and `// </core>` markers. The tests extract it and check it against figures cross-checked with an independent exact-fraction implementation.

```sh
node tests/core.test.js
```

## Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. The page is served at `https://rustybinary.github.io/SSY-Calculator/`. The path is case-sensitive, so it must match the repository name exactly.

## Updating the rates

Edit the `RATE_RANGES` list at the top of the script in `index.html`. Each entry is `[first quarter, last quarter, rate]`, where a quarter is written as the year and its first month, for example `'2027-01'` for January–March 2027. Then update `HIST_LAST_Q` to the last quarter that is now notified, and add a check to `tests/core.test.js`.

Rates are announced by the Ministry of Finance shortly before each quarter starts. The National Savings Institute publishes the full history: <https://www.nsiindia.gov.in>.

## Assumptions and limits

- Interest runs for whole calendar months from the opening month up to the month before the maturity month. Interest still uncredited at maturity is added then.
- A deposit on or before the 5th earns for that month. A later one starts the next month.
- Deposits are accepted for 15 years from the opening date, and the limit is ₹1,50,000 per financial year. An account opened part-way through a year has a window that touches 16 financial years. The calculator counts 15 deposit years by default and lets you allow the 16th; check with your bank or post office which they accept.
- Not modelled: withdrawals, premature closure, penalties for a missed year, and interest after maturity.
- Banks and post offices can differ by a few rupees in rounding. Treat your passbook as final.

## Disclaimer

This is an educational tool, not financial or legal advice. Rates and rules can change. Check the current scheme rules and your bank or post office before relying on any figure.

## License

[MIT](LICENSE)
