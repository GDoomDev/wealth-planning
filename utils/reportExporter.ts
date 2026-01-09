
import * as XLSX from 'xlsx';
import { Transaction, PaymentMethod, UserPreferences, Subscription } from '../types';
import { getTransactionEffectiveDate } from './financeUtils';

export const exportToExcel = (
    transactions: Transaction[],
    subscriptions: Subscription[],
    paymentMethods: PaymentMethod[],
    preferences: UserPreferences
) => {
    // 1. Definição do Range de Meses
    const now = new Date();
    let minDate = new Date();

    const allDates: string[] = transactions.map(t => t.date);
    subscriptions.forEach(sub => allDates.push(sub.startDate));

    if (allDates.length > 0) {
        minDate = new Date(allDates.reduce((min, d) => d < min ? d : min, allDates[0]) + 'T12:00:00');
    }

    // Start from the beginning of that year or at least 6 months back
    const startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 12, 1); // 12 months ahead

    const months: string[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
        months.push(current.toISOString().slice(0, 7));
        current.setMonth(current.getMonth() + 1);
    }

    // Meses legíveis para o header
    const monthHeaders = months.map(m => {
        const [y, mm] = m.split('-');
        const date = new Date(parseInt(y), parseInt(mm) - 1, 1);
        return date.toLocaleString('pt-BR', { month: 'long', year: '2-digit' }).replace(' de ', ' /');
    });

    const rows: (string | number | null)[][] = [];

    // Helper para adicionar linha de dados
    const addDataRow = (cc: string, desc: string, resp: string, dataMap: Record<string, number>) => {
        const row: (string | number | null)[] = [cc, desc, resp];
        months.forEach(m => {
            row.push(dataMap[m] || null);
        });
        rows.push(row);
    };

    // Helper para adicionar cabeçalho de seção
    const addSectionHeader = (title: string) => {
        rows.push([title.toUpperCase()]);
    };

    // Header Principal
    rows.push(['Centro de Custo', 'Descrição', 'Responsável', ...monthHeaders]);

    // --- SEÇÃO: ENTRADAS ---
    addSectionHeader('ENTRADAS');
    const incomes = transactions.filter(t => t.type === 'income');
    const groupedIncomes: Record<string, Record<string, number>> = {};
    incomes.forEach(t => {
        const key = `${t.category}|${t.description}|${t.debtorName || ''}`;
        if (!groupedIncomes[key]) groupedIncomes[key] = {};
        const month = t.date.slice(0, 7);
        groupedIncomes[key][month] = (groupedIncomes[key][month] || 0) + t.amount;
    });
    Object.entries(groupedIncomes).forEach(([key, monthlyData]) => {
        const [cat, desc, resp] = key.split('|');
        addDataRow(cat, desc, resp, monthlyData);
    });

    rows.push([]); // Espaçador

    // --- SEÇÃO: INVESTIMENTOS ---
    addSectionHeader('INVESTIMENTOS');
    const investments = transactions.filter(t => t.type === 'investment');
    const groupedInvestments: Record<string, Record<string, number>> = {};
    investments.forEach(t => {
        const key = `${t.category}|${t.description}|Internal`;
        if (!groupedInvestments[key]) groupedInvestments[key] = {};
        const month = t.date.slice(0, 7);
        groupedInvestments[key][month] = (groupedInvestments[key][month] || 0) + t.amount;
    });
    Object.entries(groupedInvestments).forEach(([key, monthlyData]) => {
        const [cat, desc, resp] = key.split('|');
        addDataRow(cat, desc, resp, monthlyData);
    });

    rows.push([]); // Espaçador

    // --- SEÇÃO: DESPESAS ---
    addSectionHeader('DESPESAS');

    // 1. REEMBOLSÁVEIS
    addSectionHeader('   REEMBOLSÁVEIS');
    const reimbursables = transactions.filter(t => t.type === 'expense' && t.isReimbursable);
    const groupedReimbursables: Record<string, Record<string, number>> = {};
    reimbursables.forEach(t => {
        const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
        const month = effectiveDate.slice(0, 7);
        const key = `${t.category}|${t.description}|${t.debtorName || ''}`;
        if (!groupedReimbursables[key]) groupedReimbursables[key] = {};
        groupedReimbursables[key][month] = (groupedReimbursables[key][month] || 0) + t.amount;
    });
    Object.entries(groupedReimbursables).forEach(([key, monthlyData]) => {
        const [cat, desc, resp] = key.split('|');
        addDataRow(cat, desc, resp, monthlyData);
    });

    // 2. PARCELADOS
    addSectionHeader('   PARCELADOS');
    const groupedInstallments: Record<string, Record<string, number>> = {};
    const metaInstallments: Record<string, { cat: string, resp: string, desc: string }> = {};

    transactions.filter(t => t.groupId).forEach(t => {
        const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
        const month = effectiveDate.slice(0, 7);
        const gid = t.groupId!;
        if (!groupedInstallments[gid]) {
            groupedInstallments[gid] = {};
            metaInstallments[gid] = {
                cat: t.category,
                resp: t.debtorName || '',
                desc: t.description.replace(/\(\d+\/\d+\)$/, '').trim()
            };
        }
        groupedInstallments[gid][month] = (groupedInstallments[gid][month] || 0) + t.amount;
    });
    Object.entries(groupedInstallments).forEach(([gid, monthlyData]) => {
        const { cat, desc, resp } = metaInstallments[gid];
        addDataRow(cat, desc, resp, monthlyData);
    });

    // 3. ASSINATURAS
    addSectionHeader('   ASSINATURAS');
    subscriptions.forEach(sub => {
        const monthlyData: Record<string, number> = {};

        // Para cada mês no relatório, verificamos se a assinatura estaria ativa
        // e aplicamos a lógica de data efetiva baseada na data de cobrança (mesmo dia da startDate)
        months.forEach(m => {
            const [y, mm] = m.split('-').map(Number);
            const billingDay = parseInt(sub.startDate.split('-')[2]);
            // Simulamos uma data de transação para este mês específico
            const simulatedDate = `${m}-${String(billingDay).padStart(2, '0')}`;

            // Verificamos se esta data simulada é posterior ou igual ao início real
            if (simulatedDate >= sub.startDate) {
                // Verificamos se está dentro da validade (se houver término)
                if (!sub.activeUntil || simulatedDate <= sub.activeUntil) {
                    // Agora aplicamos a lógica de fechamento de cartão se aplicável
                    const dummyTx: Transaction = {
                        id: 'dummy',
                        amount: sub.amount,
                        category: sub.category,
                        description: sub.name,
                        date: simulatedDate,
                        paymentMethod: sub.paymentMethod,
                        type: 'expense'
                    };
                    const effectiveDate = getTransactionEffectiveDate(dummyTx, paymentMethods, preferences);
                    const effectiveMonth = effectiveDate.slice(0, 7);

                    // Solo adicionamos se o mês resultante bater com o mês 'm' que estamos iterando
                    // OU se bater com um mês futuro (neste caso, adicionamos no mapa do mês efetivo)
                    if (!monthlyData[effectiveMonth]) monthlyData[effectiveMonth] = 0;
                    monthlyData[effectiveMonth] += sub.amount;
                }
            }
        });
        addDataRow(sub.category, sub.name, sub.debtorName || '', monthlyData);
    });

    // 4. DESPESAS FIXAS / VARIÁVEIS (O que sobrou)
    addSectionHeader('   OUTRAS DESPESAS');
    const others = transactions.filter(t => t.type === 'expense' && !t.isReimbursable && !t.groupId);
    const groupedOthers: Record<string, Record<string, number>> = {};
    others.forEach(t => {
        const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
        const month = effectiveDate.slice(0, 7);
        const key = `${t.category}|${t.description}|`;
        if (!groupedOthers[key]) groupedOthers[key] = {};
        groupedOthers[key][month] = (groupedOthers[key][month] || 0) + t.amount;
    });
    Object.entries(groupedOthers).forEach(([key, monthlyData]) => {
        const [cat, desc, resp] = key.split('|');
        addDataRow(cat, desc, resp, monthlyData);
    });

    // --- GERAÇÃO DO ARQUIVO ---
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Auto-size columns
    const max_width = rows.reduce((w, r) => Math.max(w, r.length), 0);
    worksheet['!cols'] = Array(max_width).fill({ wch: 15 });
    worksheet['!cols'][1] = { wch: 30 }; // Descrição maior

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Acompanhamento Mensal");

    // Título do arquivo com data atual
    const fileName = `Relatorio_Financeiro_${now.toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
