# Roadmap Overview

## Roadmap Structure

### Milestone 1: Week 0 (Feb 4-10) - Project Setup

- [ ] D1: Tooling planning
    - Is this a desktop app?
    - Where are tables stored?
    - Do we use cloud infrastructure or host server on PC which hosts database and web files, or are web files static on app?
    - How can I use something like reactnative with the above different options? Maybe its not suitable anyway. The advantage of cloud hosting is that it can be used on the user's phone aswell.
    - What tools are best for viewing maps of nodes and boxes etc, and allowing the developer to add dropdowns and have certain views of the app like a mindmap.
    - **UI Requirements (key decision factor):**
        - Data processing is not intensive - any platform will suffice
        - **Primary concern is UI capabilities:**
            - Tables within panels (multi-panel layouts with tables visible in each)
            - Large scrollable canvas/map view for bucket visualization:
                - Horizontal bars/buckets representing locations and assets
                - Arrows between buckets representing transaction flows
                - Pan/scroll in all directions (left/right/up/down)
                - Default center positions
                - Click handlers on individual arrows and bucket locations
                - Very large canvas area requiring zoom/pan controls
        - **Technology considerations:** Need framework with good support for:
            - Panel/layout management
            - Canvas/SVG rendering for bucket visualization
            - Interactive elements with custom event handlers
            - Smooth pan/zoom/scroll on large canvases

- [ ] D2: Documentation and roadmapping setup
    - Document what are the best popular design principles, and what are the different aspects of a system which need to be well designed.
    - Document the user flow.
    - Document how we can track the state of data (eg verified, complete, processed into generic transactions, etc)

- [ ] D3: Design database schema (transaction types, pooling calculations)
    - Rows to correspond with input data format
    - Tables to correspond with types of transaction: eg gbp deposit, cash crypto purchase, cryto transfer, crypto swap, initial balance setup tx. Each of these rows will have some fields automatically populated, and then there will be duplicated rows for the user to confirm if he is happy for thsoe values to be filled out. These transactions will also have a logical timestamp which defaults to the transaction timestamp, but which the user can update such that it reorders the transaction in a useful logical ordering relative to other transactions.
    - This is a view which joins all the types of transactions to create the master timeline of transactions, and at each step calculates the pool value of each balance.
    - There should be a table for each bank account, and its authentication details
    - There should be a table for pots per bank (eg Binance BTC, Lloyds gbp, Crypto.com usdt). This is not with balances, just to show what different places there are where money can be held.

---

### Milestone 2: Week 1 (Feb 11-17) - Skeleton + Authentication + Data Input

- [ ] F1: Host app such that it runs

- [ ] F2: Setup google OAuth to log in to app

- [ ] F3: First view - Exchange authentication page for inputting keys

- [ ] F4a: Second view - Data input section (file upload - xlsx)
- [ ] F4b: Second view - Data input section (API requests)

---

### Milestone 3: Week 2 (Feb 18-24) - Data Input Management View

- [ ] F5a: Third view - Expand each input data chunk to view its representation as a view of its data in the tables

- [ ] F5b: Add explanatory notes to each row

- [ ] F5c: Add generic transaction for each row
    - For each row, if not existing already, have button to add a row to the table according to its transaction type. 
    - There is a dropdwn of transaction types, and for each one a different number of fields to be populated will be shown. 
    - Values can either be copy pasted, or directly routed via dropdown selection. Maybe that is best.

---

### Milestone 4: Week 3 (Feb 25 - Mar 3) - Total Transactions View

- [ ] F6a: Fourth view - Consolidate all transactions into ordered view

- [ ] F6b: Allow logical timestamp to be adjusted for reordering purposes

- [ ] F6c: Upon every change, pooling calculations are recalculated

- [ ] F6d: Taxable events are highlighted with interested values shown

- [ ] F6e: Export functionality to print and share as pdf or xlsx.

- [ ] F6f: Whenever an export happens, a snapshot of the app and tables is taken in order that the state can be replayed and reviewed in the future. This may require a setting in the settings section of the app to indicate if the app should run from the main tables, or from specific snapshots. Maybe too complex.

---

### Milestone 5: Week 4 (Mar 4-10) - Buckets Visualization View

- [ ] F7a: Fifth view - Have every location and asset balance as a horizontal colour-coded bucket

- [ ] F7b: Transactions are ordered left-to-right as arrows between buckets. This will show balances of each bucket before and after each transaction.

- [ ] F7c: Transactions can be selected and grouped into txgroups. Each group will then be colour coded to visually associate them.

- [ ] F7d: At any point in time (before/after each transaction) the user can hover the mouse to inspect ratios of assets invested in different locations, and average ROI for each asset at the point in time.

- [ ] F8: Sixth view - Purchase review
    - Any purchase transaction can be selected, which opens the Sixth view: Purchase review. This view shows the transaction details, the graph of the bought coin, a list of future transactions affecting balance of the asset, ROI from each transaction, and theoretical ROI if the asset was completely sold today. Also more simplistic view of ROI which is (total out + current total)/(total in).
    - There should also be a list of purchases which can be browsed and sorted, with purchases able to be favourited.

- [ ] F8: (optional) Asset Review sub-view
    - Alternative to Purchase Review is Asset Review, where we simply see all transactions associated with the asset, and the gains results.

---

### Milestone 6: Week 5 (Mar 11-17) - Data Validation & Polish

- [ ] F9: Scan the fifth view to identify points where it looks like there is missing information, or missing transactions

- [ ] F10: Final testing before tax deadline

**HMRC UK Self-Assessment Tax Return online submission deadline: 31st January 2026.**

---

## Future extensions:

1. Income tracking: includes payslips, PAYE, NI, NI contributions tracking, Pensions contributions tracking.
2. Budgeting plans: including goals, Siri integration to easily add spends.
3. Forecasting: to plan large purchases or deposits, or to forecast different investment scenareos.


