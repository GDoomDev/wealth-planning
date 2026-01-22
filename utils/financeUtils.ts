import { Transaction, PaymentMethod, UserPreferences, Subscription } from '../types';

export const getTransactionEffectiveDate = (
    transaction: Transaction,
    paymentMethods: PaymentMethod[],
    preferences: UserPreferences
): string => {
    // IMPORTANT: Only apply credit card logic to EXPENSE transactions
    // Income (like reimbursements) and investments should always use their actual date
    // ALSO: skip for anticipation transactions so they show up on the day they were made
    if (transaction.type !== 'expense' || transaction.description.includes('Antecipação')) {
        return transaction.date;
    }

    // Find payment method
    const pm = paymentMethods.find(p => p.name === transaction.paymentMethod || p.id === transaction.paymentMethod);

    // If not a credit card with closing/due days, always use transaction date
    if (!pm || pm.type !== 'credit_card' || !pm.closingDay || !pm.dueDay) {
        return transaction.date;
    }

    // Parse transaction date (using T12:00:00 to avoid timezone issues)
    const txDate = new Date(transaction.date + 'T12:00:00');
    const txDay = txDate.getDate();
    const txMonth = txDate.getMonth(); // 0-indexed
    const txYear = txDate.getFullYear();

    const { closingDay, dueDay } = pm;

    // Determine which billing cycle this transaction belongs to
    let billingCycleMonth = txMonth;
    let billingCycleYear = txYear;

    // If transaction happens AFTER the closing day, it goes to NEXT billing cycle
    if (txDay > closingDay) {
        billingCycleMonth++;
        if (billingCycleMonth > 11) {
            billingCycleMonth = 0;
            billingCycleYear++;
        }
    }

    // Now calculate the month to show based on preference
    if (preferences.creditCardLogic === 'transaction_date') {
        // Option 1: Show in CLOSING month (previsibilidade)
        // The expense appears in the month when the bill closes
        return new Date(billingCycleYear, billingCycleMonth, closingDay, 12, 0, 0)
            .toISOString()
            .split('T')[0];
    } else {
        // Option 2: Show in DUE DATE month (realista)
        // The expense appears when you actually pay the bill
        let dueMonth = billingCycleMonth;
        let dueYear = billingCycleYear;

        // If due day is BEFORE closing day, the payment is in the NEXT month
        // Example: Closes on 25th, due on 5th -> payment is next month
        if (dueDay <= closingDay) {
            dueMonth++;
            if (dueMonth > 11) {
                dueMonth = 0;
                dueYear++;
            }
        }

        return new Date(dueYear, dueMonth, dueDay, 12, 0, 0)
            .toISOString()
            .split('T')[0];
    }
};

/**
 * Calculate the invoice period (start and end dates) for a given card and billing month
 * @param closingDay - The day of month when the card closes (1-31)
 * @param year - The year of the invoice closing month
 * @param month - The month of the invoice closing (1-12)
 * @returns Object with startDate and endDate in ISO format
 */
export const getInvoicePeriod = (closingDay: number, year: number, month: number) => {
    // For a card that closes on day 25:
    // January invoice (closes Jan 25) includes: Dec 26 to Jan 25

    // End date is the closing day of the specified month
    const endDate = new Date(year, month - 1, closingDay, 12, 0, 0);

    // Start date is the day after the previous closing
    const startDate = new Date(year, month - 2, closingDay + 1, 12, 0, 0);

    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
};

/**
 * Get invoice data for a specific card and billing month
 * @param transactions - All transactions
 * @param paymentMethod - The payment method (credit card)
 * @param year - The year of the invoice
 * @param month - The month of the invoice (1-12)
 * @returns Invoice details including transactions and total
 */
export const getInvoiceForCard = (
    transactions: Transaction[],
    paymentMethod: PaymentMethod,
    year: number,
    month: number,
    subscriptions: Subscription[] = []
) => {
    if (paymentMethod.type !== 'credit_card' || !paymentMethod.closingDay || !paymentMethod.dueDay) {
        return {
            transactions: [],
            total: 0,
            closingDate: '',
            dueDate: '',
            period: { startDate: '', endDate: '' }
        };
    }

    const period = getInvoicePeriod(paymentMethod.closingDay, year, month);

    // Filter transactions for this card within the billing period
    const invoiceTransactions = transactions.filter(t => {
        // Must be an expense transaction using this payment method
        if (t.type !== 'expense') return false;
        if (t.paymentMethod !== paymentMethod.name && t.paymentMethod !== paymentMethod.id) return false;

        // Must be within the billing period
        return t.date >= period.startDate && t.date <= period.endDate;
    });

    // Process subscriptions to find ones that fall into this invoice period
    const relevantSubscriptions: Transaction[] = [];

    // Get today's date in local time YYYY-MM-DD to convert properly
    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD for comparison

    subscriptions.forEach(sub => {
        // Must be associated with this card (by ID or name to be safe, though usually ID)
        const isThisCard = sub.paymentMethod === paymentMethod.id || sub.paymentMethod === paymentMethod.name;
        if (!isThisCard) return;

        // Determine the billing date for this subscription in the current invoice context
        // We need to check if there is a predicted occurrence of this subscription within [period.startDate, period.endDate]

        const billingDay = parseInt(sub.startDate.split('-')[2]);

        // Iterate through months covered by the period (usually 2 months involved in an invoice period)
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);

        // We check potential dates year-month based on range
        // Just a simple iteration over the days in the range is safer or we can construct relevant dates
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d.getDate() === billingDay) {
                // Found a matching day!
                const candidateDate = d.toISOString().split('T')[0];

                // Check if the subscription date is in the future relative to today
                if (candidateDate > todayStr) {
                    continue;
                }

                // Check if subscription was active
                if (candidateDate >= sub.startDate && (!sub.activeUntil || candidateDate <= sub.activeUntil)) {
                    // Check for duplicates (manual launch)
                    // We match by description roughly
                    const alreadyLaunched = invoiceTransactions.some(t =>
                        t.description.toLowerCase().includes(sub.name.toLowerCase()) &&
                        Math.abs(t.amount - sub.amount) < 0.01 // Optional: checking amount too
                    );

                    if (!alreadyLaunched) {
                        relevantSubscriptions.push({
                            id: `sub-${sub.id}-${candidateDate}`,
                            description: `Assinatura: ${sub.name}`,
                            amount: sub.amount,
                            category: sub.category,
                            paymentMethod: sub.paymentMethod,
                            date: candidateDate,
                            type: 'expense',
                            cardName: paymentMethod.name,
                            isReimbursable: sub.isReimbursable,
                            debtorName: sub.debtorName
                        });
                    }
                }
            }
        }
    });

    const allTransactions = [...invoiceTransactions, ...relevantSubscriptions].sort((a, b) => b.date.localeCompare(a.date));
    const total = allTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate due date
    const closingDate = new Date(year, month - 1, paymentMethod.closingDay, 12, 0, 0);
    let dueDate = new Date(year, month - 1, paymentMethod.dueDay, 12, 0, 0);

    // If due day is before or equal to closing day, due date is next month
    if (paymentMethod.dueDay <= paymentMethod.closingDay) {
        dueDate = new Date(year, month, paymentMethod.dueDay, 12, 0, 0);
    }

    return {
        transactions: allTransactions,
        total,
        closingDate: closingDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        period
    };
};
