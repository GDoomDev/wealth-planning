import { Transaction, PaymentMethod, UserPreferences } from '../types';

export const getTransactionEffectiveDate = (
    transaction: Transaction,
    paymentMethods: PaymentMethod[],
    preferences: UserPreferences
): string => {
    // IMPORTANT: Only apply credit card logic to EXPENSE transactions
    // Income (like reimbursements) and investments should always use their actual date
    if (transaction.type !== 'expense') {
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
