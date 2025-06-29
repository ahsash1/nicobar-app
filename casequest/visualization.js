document.addEventListener('DOMContentLoaded', () => {
    function updateVisualization() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Investment statistics
        const investmentTasks = tasks.filter(task => task.category === 'investments');
        const investmentsDue = investmentTasks.filter(task => !task.completed).length;
        const investmentsCompleted = investmentTasks.filter(task => task.completed).length;
        const investmentsDueThisMonth = investmentTasks.filter(task => {
            if (!task.completed && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
            }
            return false;
        }).length;
        
        // Due bills statistics
        const billTasks = tasks.filter(task => task.category === 'due-bills');
        const billsDue = billTasks.filter(task => !task.completed).length;
        const billsPaid = billTasks.filter(task => task.completed).length;
        const billsDueThisMonth = billTasks.filter(task => {
            if (!task.completed && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
            }
            return false;
        }).length;
        
        // Update investment stats
        document.getElementById('total-investments-due').textContent = investmentsDue;
        document.getElementById('total-investments-completed').textContent = investmentsCompleted;
        document.getElementById('investments-due-month').textContent = investmentsDueThisMonth;
        
        // Update due bills stats
        document.getElementById('total-due-bills').textContent = billsDue;
        document.getElementById('total-bills-paid').textContent = billsPaid;
        document.getElementById('bills-due-month').textContent = billsDueThisMonth;
        
        // Simple bar chart representation
        updateChart('investment-chart', investmentsDue, investmentsCompleted, investmentsDueThisMonth, 'Investments');
        updateChart('bills-chart', billsDue, billsPaid, billsDueThisMonth, 'Bills');
    }
    
    function updateChart(chartId, due, completed, dueThisMonth, label) {
        const chart = document.getElementById(chartId);
        chart.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <h4 style="margin-bottom: 20px; color: #2c3e50;">${label} Chart</h4>
                <div style="display: flex; justify-content: space-around; align-items: end; height: 100px; margin-bottom: 10px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="background: #e74c3c; width: 40px; height: ${Math.max(due * 15, 15)}px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                            ${due}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="background: #27ae60; width: 40px; height: ${Math.max(completed * 15, 15)}px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                            ${completed}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="background: #f39c12; width: 40px; height: ${Math.max(dueThisMonth * 15, 15)}px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                            ${dueThisMonth}
                        </div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-around;">
                    <div style="text-align: center; font-size: 12px; color: #2c3e50; font-weight: bold;">
                        Due<br>${due}
                    </div>
                    <div style="text-align: center; font-size: 12px; color: #2c3e50; font-weight: bold;">
                        Done<br>${completed}
                    </div>
                    <div style="text-align: center; font-size: 12px; color: #2c3e50; font-weight: bold;">
                        This Month<br>${dueThisMonth}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Update visualization on load
    updateVisualization();
    
    // Update periodically
    setInterval(updateVisualization, 2000);
}); 