import { Transaction, PaymentMethod, UserPreferences } from '../types';

export const getTransactionEffectiveDate = (
    transaction: Transaction,
    paymentMethods: PaymentMethod[],
    preferences: UserPreferences
): string => {
    // Always respect original date if preference is NOT closing_day
    if (preferences.creditCardLogic !== 'closing_day') {
        return transaction.date;
    }

    // Find payment method
    // We check against name OR id because legacy data might use name
    const pm = paymentMethods.find(p => p.name === transaction.paymentMethod || p.id === transaction.paymentMethod);

    // If not found or not credit card, return original date
    if (!pm || pm.type !== 'credit_card' || !pm.closingDay || !pm.dueDay) {
        return transaction.date;
    }

    // Parse using T12:00:00 to avoid timezone shifts (simple date handling)
    const txDate = new Date(transaction.date + 'T12:00:00');
    const txDay = txDate.getDate();
    const txMonth = txDate.getMonth(); // 0-indexed
    const txYear = txDate.getFullYear();

    const { closingDay, dueDay } = pm;

    let cycleEndMonth = txMonth;
    let cycleEndYear = txYear;

    // If transaction is AFTER or ON closing day, it falls into next cycle
    // Example: 25th is closing. Tx on 25th -> Next Bill.
    if (txDay >= closingDay) {
        cycleEndMonth++;
        if (cycleEndMonth > 11) {
            cycleEndMonth = 0;
            cycleEndYear++;
        }
    }

    // Now calculate Due Date relative to Cycle End Month
    let dueMonth = cycleEndMonth;
    let dueYear = cycleEndYear;

    // Assumption: If dueDay <= closingDay, the due date is in the following month 
    // relative to the billing cycle's "closing month".
    // Example: Closes Jan 25. Due Feb 5. (5 <= 25) -> Shift to Next Month (Feb).
    // Example: Closes Jan 5. Due Jan 20. (20 > 5) -> Same Month (Jan).
    if (dueDay <= closingDay) {
        dueMonth++;
        if (dueMonth > 11) {
            dueMonth = 0;
            dueYear++;
        }
    }

    const effectiveDate = new Date(dueYear, dueMonth, dueDay, 12, 0, 0);

    return effectiveDate.toISOString().split('T')[0];
};
