


## Jan 22 - 28: Project setup

1. Tooling planning
    a. Is this a desktop app?
    b. Where are tables stored?
    c. Do we use cloud infrastructure or host server on PC which hosts database and web files, or are web files static on app?
    d. How can I use something like reactnative with the above different options? Maybe its not suitable anyway.
2. Documentation and roadmapping setup.
3. Table schema
    a. Rows to correspond with input data format
    b. Tables to correspond with types of transaction: eg gbp deposit, cash crypto purchase, cryto transfer, crypto swap, initial balance setup tx. Each of these rows will have some fields automatically populated, and then there will be duplicated rows for the user to confirm if he is happy for thsoe values to be filled out. These transactions will also have a logical timestamp which defaults to the transaction timestamp, but which the user can update such that it reorders the transaction in a useful logical ordering relative to other transactions.
    c. This is a view which joins all the types of transactions to create the master timeline of transactions, and at each step calculates the pool value of each balance.

## Jan 29 - Feb 4: Skeleton + app login, first data input view

1. Host app such that it runs
2. Setup google OAuth to log in to app 
3. First view: Exchange authentication page for inputting keys
4. Second view: Data input section where user either drops in xlsx file, or makes bunches of API requests according to input.

## Jan 5 - 11: Third view: Manage data input chunks

1. Expand each input data chunk to view its representation as a view of its data in the tables. 
2. Add explanatory notes to each row
3. For each row, if not existing already, have button to add a row to the table according to its transaction type

## Jan 12 - 18: Fourth view: Total transactions view

1. Consolidate all transactions into ordered view
2. Allow logical timestamp to be adjusted for reordering purposes
3. Upon every change, pooling calculations are recalculated
4. Taxable events are highlighted with interested values shown
5. Export functionality to print and share as pdf or xlsx.

## Jan 19 - 25: Fifth view: Balances as buckets

1. Have every location and asset balance as a horizontal colour-coded bucket
2. Transactions are ordered left-to-right as arrows between buckets. This will show balances of each bucket before and after each transaction.
3. Transactions can be selected and grouped into txgroups. Each group will then be colour coded to visually associate them.
4. At any point in time (before/after each transaction) the user can hover the mouse to inspect ratios of assets invested in different locations, and average ROI for each asset at the point in time.
5. Any purchase transaction can be selected, which opens the Sixth view: Purchase review. This view shows the transaction details, the graph of the bought coin, a list of future transactions affecting balance of the asset, ROI from each transaction, and theoretical ROI if the asset was completely sold today. Also more simplistic view of ROI which is (total out + current total)/(total in).
6. Alternative to Purchase Review is Asset Review, where we simply see all transactions associated with the asset, and the gains results.

## Jan 26 - Feb 01: 

1. Scan the fifth view to identify points where it looks like there is missing information, or missing transactions.

**HMRC UK Self-Assessment Tax Return online submission deadline 31st January 2026.**

## Future extensions:

1. Income tracking: includes payslips, PAYE, NI, NI contributions tracking, Pensions contributions tracking.
2. Budgeting plans: including goals, Siri integration to easily add spends.
3. Forecasting: to plan large purchases or deposits, or to forecast different investment scenareos.
