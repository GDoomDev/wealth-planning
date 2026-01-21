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
 * @param subscriptions - All subscriptions
 * @returns Invoice details including transactions and total
 */
export const getInvoiceForCard = (
    transactions: Transaction[],
    subscriptions: Subscription[],
    paymentMethod: PaymentMethod,
    year: number,
    month: number
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

    // Process Subscriptions
    const invoiceSubscriptions: Transaction[] = [];
    subscriptions.forEach(sub => {
        // Must use this payment method
        if (sub.paymentMethod !== paymentMethod.name && sub.paymentMethod !== paymentMethod.id) return;

        // Calculate billing date for this month/period
        // For a subscription starting on 2023-01-15, the billing day is 15.
        // We need to check if there is a "15th" that falls inside the period.

        const periodStart = new Date(period.startDate + 'T12:00:00');
        const periodEnd = new Date(period.endDate + 'T12:00:00');

        // Iterate through months covered by period (usually 2 months overlap)
        // Check potential billing dates in the range
        const candidates = [
            new Date(periodStart.getFullYear(), periodStart.getMonth(), parseInt(sub.startDate.split('-')[2])),
            new Date(periodEnd.getFullYear(), periodEnd.getMonth(), parseInt(sub.startDate.split('-')[2]))
        ];

        candidates.forEach(billingDate => {
            // Adjust if day didn't exist in month (e.g. 31st in Feb) - Javascript auto-rolls over, but we might want to clamp or ignore.
            // Simple approach: The day must match or it moved to next month. 
            // Let's stick to simple ISO string comparison for range check.

            const billingDateStr = billingDate.toISOString().split('T')[0];

            // Check effective range of subscription
            if (billingDateStr < sub.startDate) return;
            if (sub.activeUntil && billingDateStr > sub.activeUntil) return;

            // Check if falls in invoice period
            if (billingDateStr >= period.startDate && billingDateStr <= period.endDate) {
                // Check if already manually added
                const alreadyLaunched = transactions.some(t =>
                    t.date === billingDateStr &&
                    (t.description.includes(`Assinatura: ${sub.name}`) || t.description === sub.name) &&
                    Math.abs(t.amount - sub.amount) < 0.01
                );

                if (!alreadyLaunched) {
                    invoiceSubscriptions.push({
                        id: `sub-${sub.id}-${billingDateStr}`,
                        amount: sub.amount,
                        category: sub.category,
                        paymentMethod: sub.paymentMethod,
                        type: 'expense',
                        description: `Assinatura: ${sub.name}`,
                        date: billingDateStr,
                        cardName: paymentMethod.name
                    });
                }
            }
        });
    });

    const allItems = [...invoiceTransactions, ...invoiceSubscriptions];
    const total = allItems.reduce((sum, t) => sum + t.amount, 0);

    // Calculate due date
    const closingDate = new Date(year, month - 1, paymentMethod.closingDay, 12, 0, 0);
    let dueDate = new Date(year, month - 1, paymentMethod.dueDay, 12, 0, 0);

    // If due day is before or equal to closing day, due date is next month
    if (paymentMethod.dueDay <= paymentMethod.closingDay) {
        dueDate = new Date(year, month, paymentMethod.dueDay, 12, 0, 0);
    }

    return {
        transactions: allItems.sort((a, b) => b.date.localeCompare(a.date)),
        total,
        closingDate: closingDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        period
    };
};
