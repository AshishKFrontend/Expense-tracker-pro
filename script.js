const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const dateInput = document.getElementById('date'); // New Date Input
const category = document.getElementById('category');
const chartPercent = document.getElementById('chart-percent');
const searchInput = document.getElementById('search');
const importFile = document.getElementById('import-file');
const budgetDisplay = document.getElementById('budget-display');

const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const deleteModal = document.getElementById('delete-modal');
const budgetModal = document.getElementById('budget-modal');
const clearModal = document.getElementById('clear-modal');
const budgetInput = document.getElementById('budget-input');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const saveBudgetBtn = document.getElementById('save-budget-btn');
const confirmClearBtn = document.getElementById('confirm-clear-btn');

let myChart = null;
let isEditing = false;
let editId = null;
let pendingDeleteId = null; // Store ID for modal action

// Initial State
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let budgetLimit = localStorage.getItem('budgetLimit') || 0;

// Set Default Date to Today
dateInput.valueAsDate = new Date();

// Update Budget Display on Load
updateBudgetDisplay();

// --- CORE FUNCTIONS ---

function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === '' || amount.value.trim() === '') {
        showToast('Please enter details properly!', 'error');
        return;
    }

    const type = document.querySelector('input[name="type"]:checked').value;
    let enteredAmount = +amount.value;

    if (type === 'expense') enteredAmount = enteredAmount * -1;

    // Use selected date or fallback to today if empty (rare case)
    let selectedDate = dateInput.value ? new Date(dateInput.value) : new Date();
    // Format date for display: DD/MM/YYYY
    const formattedDate = selectedDate.toLocaleDateString('en-IN'); 
    // Format date for input: YYYY-MM-DD (ISO) - useful for edit mode
    const rawDate = dateInput.value;

    if (type === 'expense') {
        checkBudgetWarning(Math.abs(enteredAmount));
    }

    if (isEditing) {
        // Update Existing
        const index = transactions.findIndex(t => t.id === editId);
        transactions[index].text = text.value;
        transactions[index].amount = enteredAmount;
        transactions[index].icon = category.value;
        transactions[index].type = type;
        transactions[index].date = formattedDate; 
        transactions[index].rawDate = rawDate; // Store raw for editing later
        
        isEditing = false;
        editId = null;
        submitBtn.innerHTML = 'Add Transaction <i class="fas fa-chevron-right"></i>';
        cancelBtn.style.display = 'none';
        formTitle.innerText = 'New Transaction';
        showToast('Transaction Updated!', 'success');
    } else {
        // Add New
        const transaction = {
            id: Math.floor(Math.random() * 100000000),
            text: text.value,
            amount: enteredAmount,
            icon: category.value,
            date: formattedDate,
            rawDate: rawDate,
            type: type
        };
        transactions.push(transaction);
        showToast('Transaction Added Successfully!');
    }

    updateLocalStorage();
    init();
    
    // Reset Form
    text.value = ''; 
    amount.value = '';
    dateInput.valueAsDate = new Date(); // Reset to today
    document.getElementById('type-inc').checked = true;
}

// Replaced direct delete with Modal
function deleteTransaction(id) {
    pendingDeleteId = id;
    openModal('delete');
}

// Function executed after Modal Confirmation
function performDelete() {
    if(pendingDeleteId !== null) {
        transactions = transactions.filter(transaction => transaction.id !== pendingDeleteId);
        updateLocalStorage();
        init();
        showToast('Transaction Removed', 'error');
        pendingDeleteId = null;
        closeModal();
    }
}

function editTransaction(id) {
    const item = transactions.find(t => t.id === id);
    if (!item) return;

    // Populate Form
    text.value = item.text;
    amount.value = Math.abs(item.amount);
    category.value = item.icon || 'fa-wallet';
    
    // Set Date (Handle old data without rawDate)
    if (item.rawDate) {
        dateInput.value = item.rawDate;
    } else {
        // Fallback logic for old data format if needed
        dateInput.valueAsDate = new Date(); 
    }
    
    // Set Radio
    if (item.amount < 0) {
        document.getElementById('type-exp').checked = true;
    } else {
        document.getElementById('type-inc').checked = true;
    }

    // UI Changes
    isEditing = true;
    editId = id;
    submitBtn.innerHTML = 'Update Transaction <i class="fas fa-sync"></i>';
    cancelBtn.style.display = 'block';
    formTitle.innerText = 'Edit Transaction';
    
    document.querySelector('.col-left').scrollTop = 0;
}

// Cancel Edit Mode
cancelBtn.addEventListener('click', () => {
    isEditing = false;
    editId = null;
    text.value = '';
    amount.value = '';
    dateInput.valueAsDate = new Date();
    submitBtn.innerHTML = 'Add Transaction <i class="fas fa-chevron-right"></i>';
    cancelBtn.style.display = 'none';
    formTitle.innerText = 'New Transaction';
});

// --- MODAL FUNCTIONS (Replaces Prompts) ---

function openModal(type) {
    modalOverlay.classList.remove('hidden');
    // Hide all first
    document.querySelectorAll('.custom-modal').forEach(m => m.classList.add('hidden'));
    
    if(type === 'delete') deleteModal.classList.remove('hidden');
    if(type === 'budget') {
        budgetModal.classList.remove('hidden');
        budgetInput.value = budgetLimit || '';
        budgetInput.focus();
    }
    if(type === 'clear') clearModal.classList.remove('hidden');
}

function closeModal() {
    modalOverlay.classList.add('hidden');
}

function openBudgetModal() {
    openModal('budget');
}

function openClearModal() {
    openModal('clear');
}

// Event Listeners for Modal Buttons
confirmDeleteBtn.addEventListener('click', performDelete);

saveBudgetBtn.addEventListener('click', () => {
    const val = budgetInput.value;
    if(val && val > 0) {
        budgetLimit = parseFloat(val);
        localStorage.setItem('budgetLimit', budgetLimit);
        updateBudgetDisplay();
        showToast(`Budget set to ₹${budgetLimit}`);
        closeModal();
    } else {
        showToast('Please enter valid amount', 'error');
    }
});

confirmClearBtn.addEventListener('click', () => {
    transactions = [];
    updateLocalStorage();
    init();
    showToast('All Data Cleared', 'error');
    closeModal();
});

// Close modal on click outside
modalOverlay.addEventListener('click', (e) => {
    if(e.target === modalOverlay) closeModal();
});


// --- DISPLAY & DOM ---

function init() {
    filterTransactions();
    updateValues();
}

function addTransactionDOM(transaction) {
    const sign = transaction.amount < 0 ? '-' : '+';
    const item = document.createElement('li');
    
    item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');
    const iconClass = transaction.icon ? transaction.icon : 'fa-wallet';

    item.innerHTML = `
        <div class="list-item-left">
            <div class="list-icon"><i class="fas ${iconClass}"></i></div>
            <div class="list-info">
                <h4>${transaction.text}</h4>
                <small>${transaction.date || 'Today'}</small>
            </div>
        </div>
        <div class="list-item-right">
            <span class="list-amount">${sign}₹${Math.abs(transaction.amount).toLocaleString('en-IN')}</span>
            <div class="actions">
                <button class="action-btn" onclick="editTransaction(${transaction.id})"><i class="fas fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteTransaction(${transaction.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;
    list.appendChild(item); 
}

function updateValues() {
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = (amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1);

    balance.innerText = `₹${formatMoney(total)}`;
    money_plus.innerText = `+₹${formatMoney(income)}`;
    money_minus.innerText = `-₹${formatMoney(expense)}`;

    const expenseAmounts = amounts.filter(item => item < 0);
    let maxExpense = 0;
    if (expenseAmounts.length > 0) maxExpense = Math.min(...expenseAmounts) * -1;
    document.getElementById('biggest-expense').innerText = `₹${formatMoney(maxExpense)}`;

    renderChart(income, expense);
}

// --- BUDGET & ANALYTICS ---

function updateBudgetDisplay() {
    if (budgetLimit > 0) {
        budgetDisplay.innerText = `₹${formatMoney(parseFloat(budgetLimit))}`;
    } else {
        budgetDisplay.innerText = "Not Set";
    }
}

function checkBudgetWarning(newExpenseAmount, totalExpOverride = null) {
    if (budgetLimit <= 0) return;

    let currentTotalExpense = totalExpOverride;
    
    if (totalExpOverride === null) {
        currentTotalExpense = transactions
            .filter(t => t.amount < 0)
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    }

    const projectedTotal = currentTotalExpense + newExpenseAmount;
    
    if (projectedTotal > budgetLimit) {
        showToast(`Warning: Budget Exceeded by ₹${formatMoney(projectedTotal - budgetLimit)}`, 'error');
    } else if (projectedTotal > (budgetLimit * 0.9)) {
        showToast('Warning: You have reached 90% of your budget!', 'warning');
    }
}

// --- FILTERS & SEARCH ---

function filterData(type) {
    document.querySelectorAll('.f-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    filterTransactions(type);
}

function filterTransactions(type = 'all') {
    list.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();
    
    let filtered = transactions;
    if (type === 'income') filtered = transactions.filter(t => t.amount > 0);
    if (type === 'expense') filtered = transactions.filter(t => t.amount < 0);

    filtered = filtered.filter(t => t.text.toLowerCase().includes(searchTerm));

    // Sort by Date (Newest First) - using rawDate for accurate sorting
    filtered.sort((a, b) => {
        const dateA = new Date(a.rawDate || 0); // fallback 0 for old data
        const dateB = new Date(b.rawDate || 0);
        return dateB - dateA; // Descending order
    });

    if (filtered.length === 0) {
        list.innerHTML = '<p class="empty-msg">No transactions found 📂</p>';
    } else {
        filtered.forEach(addTransactionDOM);
    }
}

searchInput.addEventListener('input', () => {
    const activeBtn = document.querySelector('.f-btn.active');
    const type = activeBtn ? activeBtn.innerText.toLowerCase() : 'all';
    let filterType = 'all';
    if (type === 'inc') filterType = 'income';
    else if (type === 'exp') filterType = 'expense';
    filterTransactions(filterType);
});

// --- IMPORT / EXPORT ---

function exportData() {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_data_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Data Exported Successfully!');
}

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                transactions = importedData;
                updateLocalStorage();
                init();
                showToast('Data Imported Successfully!');
            } else {
                showToast('Invalid File Format', 'error');
            }
        } catch (error) {
            showToast('Error reading file', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

// --- HELPERS ---

function formatMoney(amount) {
    return amount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    
    let icon = '<i class="fas fa-check-circle"></i>';
    if(type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    if(type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderChart(income, expense) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    let percent = 0;
    if(income > 0) percent = Math.round((expense / income) * 100);
    chartPercent.innerText = `${percent}%`;
    chartPercent.style.color = percent > 80 ? '#ef4444' : '#ffffff';

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: { legend: { display: false } }
        }
    });
}

function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Event Listeners
form.addEventListener('submit', addTransaction);
init();