document.addEventListener('DOMContentLoaded', () => {
    const incomeForm = document.getElementById('income-form');
    const expenseForm = document.getElementById('expense-form');
    const incomeTypeSelect = document.getElementById('income-type');
    const incomeAmountInput = document.getElementById('income-amount');
    const expenseTypeSelect = document.getElementById('expense-type');
    const expenseAmountInput = document.getElementById('expense-amount');
    const savingsSpan = document.getElementById('savings');
    
    let incomes = JSON.parse(localStorage.getItem('incomes')) || [];
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    
    function saveData() {
        localStorage.setItem('incomes', JSON.stringify(incomes));
        localStorage.setItem('expenses', JSON.stringify(expenses));
    }
    
    function calculateSavings() {
        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const savings = totalIncome - totalExpenses;
        savingsSpan.textContent = savings.toFixed(2);
        return { totalIncome, totalExpenses, savings };
    }
    
    function updateCharts() {
        updateIncomePieChart();
        updateExpensePieChart();
        calculateSavings();
    }
    
    function updateIncomePieChart() {
        const incomeChart = document.getElementById('income-pie-chart');
        const incomeByType = {};
        
        incomes.forEach(income => {
            incomeByType[income.type] = (incomeByType[income.type] || 0) + income.amount;
        });
        
        if (Object.keys(incomeByType).length === 0) {
            incomeChart.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No income data yet</p>';
            return;
        }
        
        const total = Object.values(incomeByType).reduce((sum, amount) => sum + amount, 0);
        const colors = ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'];
        
        // Create dynamic conic gradient based on actual values
        let gradientParts = [];
        let currentAngle = 0;
        
        Object.entries(incomeByType).forEach(([type, amount], index) => {
            const percentage = (amount / total) * 100;
            const angle = (amount / total) * 360;
            const color = colors[index % colors.length];
            
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            gradientParts.push(`${color} ${startAngle}deg ${endAngle}deg`);
            currentAngle += angle;
        });
        
        const gradientString = gradientParts.join(', ');
        
        let chartHTML = `<div class="pie-visual" style="background: conic-gradient(${gradientString});"></div>`;
        chartHTML += '<div class="pie-legend">';
        
        Object.entries(incomeByType).forEach(([type, amount], index) => {
            const percentage = ((amount / total) * 100).toFixed(1);
            const color = colors[index % colors.length];
            chartHTML += `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: ${color}"></span>
                    <span class="legend-text">${type}: $${amount.toFixed(2)} (${percentage}%)</span>
                </div>
            `;
        });
        chartHTML += '</div>';
        
        incomeChart.innerHTML = chartHTML;
    }
    
    function updateExpensePieChart() {
        const expenseChart = document.getElementById('expense-pie-chart');
        const expenseByType = {};
        
        expenses.forEach(expense => {
            expenseByType[expense.type] = (expenseByType[expense.type] || 0) + expense.amount;
        });
        
        if (Object.keys(expenseByType).length === 0) {
            expenseChart.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No expense data yet</p>';
            return;
        }
        
        const total = Object.values(expenseByType).reduce((sum, amount) => sum + amount, 0);
        const colors = ['#e74c3c', '#f39c12', '#e67e22', '#c0392b', '#d35400'];
        
        // Create dynamic conic gradient based on actual values
        let gradientParts = [];
        let currentAngle = 0;
        
        Object.entries(expenseByType).forEach(([type, amount], index) => {
            const percentage = (amount / total) * 100;
            const angle = (amount / total) * 360;
            const color = colors[index % colors.length];
            
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            gradientParts.push(`${color} ${startAngle}deg ${endAngle}deg`);
            currentAngle += angle;
        });
        
        const gradientString = gradientParts.join(', ');
        
        let chartHTML = `<div class="pie-visual" style="background: conic-gradient(${gradientString});"></div>`;
        chartHTML += '<div class="pie-legend">';
        
        Object.entries(expenseByType).forEach(([type, amount], index) => {
            const percentage = ((amount / total) * 100).toFixed(1);
            const color = colors[index % colors.length];
            chartHTML += `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: ${color}"></span>
                    <span class="legend-text">${type}: $${amount.toFixed(2)} (${percentage}%)</span>
                </div>
            `;
        });
        chartHTML += '</div>';
        
        expenseChart.innerHTML = chartHTML;
    }
    
    incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newIncome = {
            type: incomeTypeSelect.value,
            amount: parseFloat(incomeAmountInput.value),
            date: new Date().toISOString().split('T')[0]
        };
        
        incomes.push(newIncome);
        saveData();
        updateCharts();
        
        incomeAmountInput.value = '';
    });
    
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newExpense = {
            type: expenseTypeSelect.value,
            amount: parseFloat(expenseAmountInput.value),
            date: new Date().toISOString().split('T')[0]
        };
        
        expenses.push(newExpense);
        saveData();
        updateCharts();
        
        expenseAmountInput.value = '';
    });
    
    // Initial render
    updateCharts();
}); 