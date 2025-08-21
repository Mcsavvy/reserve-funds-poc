# Imports
# import pandas as pd
# import numpy as np

# inputs

# Model inputs
MODEL = "Society Maintenance Model"
STARTING_BALANCE = 0
MONTHLY_FEES = 120000 / 12  # Base maintenance $120,000 annually
MAXIMUM_FEE_INCREASE = 13  # percentage
HOUSING = 1  # Set to 1 since MONTHLY_FEES already represents total
FISCAL_YEAR = 2022
PERIOD = 30
IMMEDIATE_ASSESSMENT = 0
LOAN_AMOUNT = 0  # Principal loan amount (legacy, now handled dynamically)
LOAN_TERM_YEARS = 10
ANNUAL_LOAN_INTEREST_RATE = 6  # percentage
LIQUIDATED_INVESTMENT_PRINCIPAL = 0
LIQUIDATED_EARNINGS = 0
BANK_SAVINGS_INTEREST_RATE = 2  # percentage
LTIM_PERCENTAGE = 0  # percentage
LTIM_RETURN_RATE = 4  # percentage
ANNUAL_INVESTMENT_RETURN_RATE = 5  # percentage
INFLATION_RATE = 5  # percentage - matches Society Maintenance Model

# Additional inputs for proper financial calculations
INVESTMENT_AMOUNT_COMPOUND = 0  # Amount allocated for compound growth
AMOUNT_ALLOCATED_TO_LTIM = 0  # Amount allocated to LTIM

# Loan and Safety Net parameters (based on Society Maintenance Model)
LOAN_THRESHOLD_PERCENTAGE = 70  # percentage - portion of large expenses that can be financed
LOAN_RATE_PERCENTAGE = 10  # percentage - annual interest rate for loans
LOAN_TERM_YEARS_MODEL = 5  # years - loan repayment term
SAFETY_NET_PERCENTAGE = 10  # percentage - safety net as % of total collections

# Fee Optimization parameters
OPTIMIZE_MONTHLY_FEES = True  # When True, automatically adjust fees to eliminate deficits
MIN_RESERVE_BALANCE = 0  # Minimum reserve balance to maintain
OPTIMIZATION_TOLERANCE = 1000  # Tolerance for deficit elimination ($)

# expenses - Test data with both one-time and recurring items
MODEL_ITEMS = [
    {
        "name": "Roof Replacement",
        "redundancy": 20,  # Every 20 years
        "remaining_life": 5,  # First occurrence in year 5
        "cost": 50000,
        "is_sirs": False,
        "type": "Large",
    },
    {
        "name": "HVAC Maintenance",
        "redundancy": 3,  # Every 3 years
        "remaining_life": 1,  # First occurrence in year 1
        "cost": 5000,
        "is_sirs": False,
        "type": "Small",
    },
    {
        "name": "Elevator Modernization",
        "redundancy": 25,  # Every 25 years
        "remaining_life": 15,  # First occurrence in year 15
        "cost": 75000,
        "is_sirs": False,
        "type": "Large",
    },
    {
        "name": "Plumbing riser replacement",
        "redundancy": 1,  # One-time only
        "remaining_life": 22,
        "cost": 80000,
        "is_sirs": False,
        "type": "Large",
    },
]


# formulas
def calculate_yearly_expenses(model_items, period_years, start_year):
    """
    Calculate yearly expenses following the documented algorithm.
    Returns: (spendings_array, spending_data_array)
    """
    # Initialize spending arrays
    spendings = [0] * period_years  # Total spending per year
    spending_data = [[] for _ in range(period_years)]  # Detailed items per year
    
    for item in model_items:
        remaining_life = item["remaining_life"]
        redundancy = item["redundancy"]
        cost = item["cost"]
        
        # Skip items that occur beyond simulation period
        if remaining_life >= period_years:
            continue
        
        # Calculate number of occurrences within period
        if redundancy <= 1:
            # One-time occurrence
            redundancies = 1
        else:
            # Recurring occurrences
            redundancies = ((period_years - remaining_life) // redundancy) + 1
        
        # Place each occurrence in appropriate year
        for i in range(redundancies):
            occurrence_year = remaining_life + (i * redundancy)
            
            if occurrence_year < period_years:
                # Add cost to year's total expenses
                spendings[occurrence_year] += cost
                
                # Store detailed item information
                spending_data[occurrence_year].append({
                    'name': item['name'],
                    'cost': cost,
                    'year': occurrence_year,
                    'redundancy_at': i,
                    'type': item.get('type', 'Small'),
                    'is_sirs': item.get('is_sirs', False)
                })
    
    return spendings, spending_data


def get_expenses_with_loan_details(year: int, housing: int):
    """
    Calculate annual expenses from model items based on replacement schedules.
    Returns tuple: (total_expenses, large_expenses, loan_portion, cash_portion)
    Uses the corrected algorithm from documentation.
    """
    total_expenses = 0
    large_expenses = 0
    loan_portion = 0
    cash_portion = 0
    
    # Calculate year index from start of simulation
    year_index = year - FISCAL_YEAR
    
    # Pre-calculate all expenses if not done already
    if not hasattr(get_expenses_with_loan_details, '_cached_expenses'):
        spendings, spending_data = calculate_yearly_expenses(MODEL_ITEMS, PERIOD, FISCAL_YEAR)
        get_expenses_with_loan_details._cached_expenses = (spendings, spending_data)
    
    spendings, spending_data = get_expenses_with_loan_details._cached_expenses
    
    # Get expenses for this specific year
    if 0 <= year_index < len(spendings):
        items_this_year = spending_data[year_index]
        
        for item_data in items_this_year:
            # Apply inflation from start year to current year
            years_of_inflation = year_index
            inflated_cost = item_data['cost'] * (1 + INFLATION_RATE / 100) ** years_of_inflation
            total_expenses += inflated_cost
            
            # Track large vs small expenses for loan calculations
            if item_data['type'].upper() == "LARGE":
                large_expenses += inflated_cost
                # For large expenses, calculate loan vs cash portions
                loan_amount = inflated_cost * (LOAN_THRESHOLD_PERCENTAGE / 100)
                cash_amount = inflated_cost - loan_amount
                loan_portion += loan_amount
                cash_portion += cash_amount
            else:
                # Small expenses are paid fully in cash
                cash_portion += inflated_cost
    
    return total_expenses, large_expenses, loan_portion, cash_portion


def get_expenses(year: int, housing: int):
    """
    Legacy function - returns only total expenses for backwards compatibility.
    """
    total_expenses, _, _, _ = get_expenses_with_loan_details(year, housing)
    return total_expenses


def get_total_available_to_invest(
    starting_balance: int,
    immediate_assessment: int,
    loan_amount: int,
    liquidated_investment_principal: int,
    liquidated_earnings: int,
    yearly_collections: int,
):
    """
    DEPRECATED: This calculates the initial total funds available.
    Use get_available_to_invest_for_year() for year-specific calculations.
    """
    return (
        starting_balance
        + immediate_assessment
        + loan_amount
        + liquidated_investment_principal
        + liquidated_earnings
        + yearly_collections
    )


def get_available_to_invest_for_year(
    starting_amount: int,
    planned_spending: int,
    loss_in_purchasing_power: int,
    investment_strategy_amount: int,
):
    """
    Calculate Available to Invest for a specific year.
    Formula: Starting Amount - Planned Spending this year - Loss in Purchase power - Amount of Investment Strategy
    This amount changes each year based on inflation rate and investment strategy.
    """
    return starting_amount - planned_spending - loss_in_purchasing_power - investment_strategy_amount


def get_total_amount_invested(
    total_available_to_invest: int,
    ltim_percentage: int,
):
    """
    Total amount invested is the total available to invest multiplied by the ltim percentage.
    """
    return total_available_to_invest * ltim_percentage / 100


def get_net_earnings(
    total_amount_invested: int,
    annual_investment_return_rate: int,
):
    """
    Net earnings are calculated by multiplying the total amount invested by the annual investment return rate.
    """
    return total_amount_invested * annual_investment_return_rate / 100


def get_loss_in_purchasing_power(
    total_available_to_invest: int,
    inflation_rate: int,
):
    """
    Loss in purchasing power is calculated by multiplying the total available to invest by the inflation rate.
    Formula: Total Available To Invest × Inflation Rate
    """
    return total_available_to_invest * inflation_rate / 100


def calculate_monthly_loan_payment(
    principal: int,
    annual_interest_rate: int,
    loan_term_years: int,
):
    """
    Calculate monthly loan payment using standard amortization formula.
    Formula: P × (r/12) × (1 + r/12)^(n×12) / [(1 + r/12)^(n×12) - 1]
    Where P = Principal, r = Annual interest rate, n = Loan term in years
    """
    if principal == 0 or annual_interest_rate == 0:
        return 0
    
    monthly_rate = annual_interest_rate / 100 / 12
    number_of_payments = loan_term_years * 12
    
    numerator = principal * monthly_rate * (1 + monthly_rate) ** number_of_payments
    denominator = (1 + monthly_rate) ** number_of_payments - 1
    
    return numerator / denominator


def get_loan_payments(
    principal: int,
    annual_interest_rate: int,
    loan_term_years: int,
):
    """
    Annual loan payments are calculated as Monthly Loan Payment × 12.
    """
    monthly_payment = calculate_monthly_loan_payment(principal, annual_interest_rate, loan_term_years)
    return monthly_payment * 12


def get_remaining_amount(
    total_available_to_invest: int,
    net_earnings: int,
    compound_value_of_savings: int,
    projected_ltim_earnings: int,
    loss_in_purchasing_power: int,
    loan_payments: int,
    expenses: int,
):
    """
    Remaining amount is calculated using the complete formula from the documentation.
    Formula: Total Available To Invest + Net Earnings + Compound Value of Savings + 
    Projected LTIM Earnings - Loss in Purchasing Power - Expenses - Loan Payments
    """
    return (
        total_available_to_invest
        + net_earnings
        + compound_value_of_savings
        + projected_ltim_earnings
        - loss_in_purchasing_power
        - expenses
        - loan_payments
    )


def get_compound_value_of_savings(
    investment_amount_compound: int,
    bank_savings_interest_rate: int,
):
    """
    Compound value of savings is calculated by applying bank savings interest to the compound investment amount.
    Formula: Investment Amount Taken for Compound × (1 + Bank Savings Interest Rate)
    """
    return investment_amount_compound * (1 + bank_savings_interest_rate / 100)


def get_projected_ltim_earnings(
    amount_allocated_to_ltim: int,
    ltim_return_rate: int,
):
    """
    Projected LTIM earnings are calculated by multiplying the amount allocated to LTIM by the LTIM return rate.
    Formula: Amount Allocated to LTIM × LTIM Return Rate
    """
    return amount_allocated_to_ltim * (ltim_return_rate / 100)


# Loan and Safety Net functions
def calculate_reserve_contribution_for_future_expenses(future_expenses_by_year: dict, current_year: int):
    """
    Calculate reserve contribution needed for future expenses.
    Formula: Sum of (Future Large Expenses × Loan Threshold %) / (Years until expense - 1)
    """
    reserve_contribution = 0
    
    for expense_year, (large_expenses, _) in future_expenses_by_year.items():
        if expense_year > current_year and large_expenses > 0:
            # Calculate contribution needed for this future expense
            years_until_expense = max(expense_year - current_year, 1)
            annual_contribution = (large_expenses * (LOAN_THRESHOLD_PERCENTAGE / 100)) / years_until_expense
            reserve_contribution += annual_contribution
    
    return reserve_contribution


def calculate_loan_payments_for_year(active_loans: list, year: int):
    """
    Calculate total loan payments for a given year based on active loans.
    Each loan in active_loans should be: {'principal': amount, 'start_year': year, 'term': years}
    """
    total_payments = 0
    
    for loan in active_loans:
        loan_start = loan['start_year']
        loan_end = loan_start + loan['term']
        
        if loan_start <= year < loan_end:
            # This loan is active in this year
            annual_payment = get_loan_payments(
                loan['principal'],
                LOAN_RATE_PERCENTAGE,
                loan['term']
            )
            total_payments += annual_payment
    
    return total_payments


def calculate_safety_net_target(base_maintenance: float, future_expenses: float, loan_repayments: float):
    """
    Calculate safety net target.
    Formula: Safety Net % × (Base Maintenance + Future Expenses + Loan Repayments)
    """
    total_collections = base_maintenance + future_expenses + loan_repayments
    return total_collections * (SAFETY_NET_PERCENTAGE / 100)


def calculate_safety_net_top_up(safety_net_target: float, provisional_end_balance: float):
    """
    Calculate safety net top-up amount.
    Formula: max(0, Safety Net Target - Provisional End Balance)
    """
    return max(0, safety_net_target - provisional_end_balance)


# Fee Optimization functions
def simulate_with_monthly_fees(monthly_fees_override=None):
    """
    Run the complete simulation with given monthly fees.
    Returns: (data, min_balance, total_deficits)
    """
    # Use override fees if provided, otherwise use global setting
    effective_monthly_fees = monthly_fees_override if monthly_fees_override is not None else MONTHLY_FEES
    
    # Initialize loan tracking
    active_loans = []
    
    # Pre-calculate all future expenses
    future_expenses_by_year = {}
    for year in range(FISCAL_YEAR, FISCAL_YEAR + PERIOD):
        total_exp, large_exp, loan_portion, cash_portion = get_expenses_with_loan_details(year, HOUSING)
        future_expenses_by_year[year] = (large_exp, total_exp)
    
    simulation_data = []
    min_balance = float('inf')
    total_deficits = 0
    
    for year in range(FISCAL_YEAR, FISCAL_YEAR + PERIOD):
        # Get starting balance (opening balance)
        if year == FISCAL_YEAR:
            opening_balance = STARTING_BALANCE
        else:
            opening_balance = simulation_data[-1]["closing_balance"]
        
        # Calculate base maintenance (inflated) with effective monthly fees
        years_from_start = year - FISCAL_YEAR
        base_maintenance = effective_monthly_fees * HOUSING * 12 * (1 + INFLATION_RATE / 100) ** years_from_start
        
        # Get expense details for this year
        total_expenses, large_expenses, loan_portion, cash_portion = get_expenses_with_loan_details(year, HOUSING)
        
        # Create new loans for large expenses this year
        if loan_portion > 0:
            new_loan = {
                'principal': loan_portion,
                'start_year': year,
                'term': LOAN_TERM_YEARS_MODEL
            }
            active_loans.append(new_loan)
        
        # Calculate reserve contribution for future expenses
        reserve_contribution = calculate_reserve_contribution_for_future_expenses(future_expenses_by_year, year)
        
        # Calculate loan repayments for active loans
        loan_repayments = calculate_loan_payments_for_year(active_loans, year)
        
        # Collections without safety net
        collections_without_safety_net = base_maintenance + reserve_contribution + loan_repayments
        
        # Provisional end balance (before safety net)
        provisional_end_balance = opening_balance + collections_without_safety_net - total_expenses - loan_repayments
        
        # Calculate safety net
        safety_net_target = calculate_safety_net_target(base_maintenance, total_expenses, loan_repayments)
        safety_net_top_up = calculate_safety_net_top_up(safety_net_target, provisional_end_balance)
        
        # Total maintenance collected (including safety net top-up)
        total_maintenance_collected = collections_without_safety_net + safety_net_top_up
        
        # Final closing balance
        closing_balance = opening_balance + total_maintenance_collected - total_expenses - loan_repayments
        
        # Track minimum balance and deficits
        min_balance = min(min_balance, closing_balance)
        if closing_balance < MIN_RESERVE_BALANCE:
            total_deficits += abs(closing_balance - MIN_RESERVE_BALANCE)
        
        simulation_data.append({
            "year": year,
            "opening_balance": opening_balance,
            "base_maintenance": base_maintenance,
            "future_expenses_in_year": total_expenses,
            "reserve_contribution": reserve_contribution,
            "loan_repayments": loan_repayments,
            "collections_without_safety_net": collections_without_safety_net,
            "provisional_end_balance": provisional_end_balance,
            "safety_net_target": safety_net_target,
            "safety_net_top_up": safety_net_top_up,
            "total_maintenance_collected": total_maintenance_collected,
            "closing_balance": closing_balance,
            "large_expenses": large_expenses,
            "loan_portion": loan_portion,
            "cash_portion": cash_portion,
            "active_loans_count": len([loan for loan in active_loans if loan['start_year'] <= year < loan['start_year'] + loan['term']]),
        })
    
    return simulation_data, min_balance, total_deficits


def optimize_monthly_fees():
    """
    Use binary search to find optimal monthly fees that eliminate deficits.
    Returns: optimized_monthly_fees
    """
    if not OPTIMIZE_MONTHLY_FEES:
        return MONTHLY_FEES
    
    print("Optimizing monthly fees to eliminate deficits...")
    
    # Initial bounds for binary search
    lower_bound = MONTHLY_FEES * 0.5  # Start with 50% of original
    upper_bound = MONTHLY_FEES * 3.0  # Cap at 300% of original
    
    # First check if current fees are already sufficient
    _, min_balance, total_deficits = simulate_with_monthly_fees(MONTHLY_FEES)
    if min_balance >= MIN_RESERVE_BALANCE and total_deficits <= OPTIMIZATION_TOLERANCE:
        print(f"Current monthly fees of ${MONTHLY_FEES:,.2f} are already optimal.")
        return MONTHLY_FEES
    
    # Binary search for optimal fees
    max_iterations = 20
    iteration = 0
    
    while iteration < max_iterations and (upper_bound - lower_bound) > 1.0:
        iteration += 1
        mid_fees = (lower_bound + upper_bound) / 2
        
        _, min_balance, total_deficits = simulate_with_monthly_fees(mid_fees)
        
        print(f"  Iteration {iteration}: Fees ${mid_fees:,.2f} -> Min Balance: ${min_balance:,.2f}, Deficits: ${total_deficits:,.2f}")
        
        if min_balance >= MIN_RESERVE_BALANCE and total_deficits <= OPTIMIZATION_TOLERANCE:
            # Fees are sufficient, try lower
            upper_bound = mid_fees
        else:
            # Fees are insufficient, need higher
            lower_bound = mid_fees
    
    # Use the upper bound as the optimal fee (ensures no deficits)
    optimized_fees = upper_bound
    
    # Validate the result
    _, min_balance, total_deficits = simulate_with_monthly_fees(optimized_fees)
    
    print("Optimization complete!")
    print(f"  Original fees: ${MONTHLY_FEES:,.2f}")
    print(f"  Optimized fees: ${optimized_fees:,.2f}")
    print(f"  Fee increase: {((optimized_fees / MONTHLY_FEES - 1) * 100):,.1f}%")
    print(f"  Final min balance: ${min_balance:,.2f}")
    print(f"  Total deficits: ${total_deficits:,.2f}")
    print()
    
    return optimized_fees


# build years data

# Optimize monthly fees if enabled
if OPTIMIZE_MONTHLY_FEES:
    optimized_monthly_fees = optimize_monthly_fees()
else:
    optimized_monthly_fees = MONTHLY_FEES

# Run simulation with optimized fees
data, min_balance_achieved, total_deficits_achieved = simulate_with_monthly_fees(optimized_monthly_fees)

# Legacy simulation loop for backward compatibility
# (The actual data is now generated by simulate_with_monthly_fees)
active_loans = []
future_expenses_by_year = {}
for year in range(FISCAL_YEAR, FISCAL_YEAR + PERIOD):
    total_exp, large_exp, loan_portion, cash_portion = get_expenses_with_loan_details(year, HOUSING)
    future_expenses_by_year[year] = (large_exp, total_exp)

# Add legacy fields to data for compatibility (with optimized monthly fees)
for i, year_data in enumerate(data):
    year = year_data['year']
    
    # Legacy calculations for compatibility using optimized fees
    yearly_collections = year_data['total_maintenance_collected']
    
    # Calculate initial total funds available (one-time calculation)
    initial_total_funds = get_total_available_to_invest(
        year_data['opening_balance'],
        IMMEDIATE_ASSESSMENT,
        0,
        LIQUIDATED_INVESTMENT_PRINCIPAL,
        LIQUIDATED_EARNINGS,
        yearly_collections
    )
    
    # Calculate loss in purchasing power based on initial funds
    loss_in_purchasing_power = get_loss_in_purchasing_power(
        initial_total_funds,
        INFLATION_RATE,
    )
    
    # Calculate investment strategy amounts
    investment_strategy_amount = INVESTMENT_AMOUNT_COMPOUND + AMOUNT_ALLOCATED_TO_LTIM
    
    # Calculate Available to Invest for this specific year (corrected formula)
    total_available_to_invest = get_available_to_invest_for_year(
        initial_total_funds,
        year_data['future_expenses_in_year'],  # Planned spending this year
        loss_in_purchasing_power,
        investment_strategy_amount
    )

    # get total amount invested
    total_amount_invested = get_total_amount_invested(
        total_available_to_invest,
        LTIM_PERCENTAGE,
    )

    net_earnings = get_net_earnings(
        total_amount_invested,
        ANNUAL_INVESTMENT_RETURN_RATE,
    )

    compound_value_of_savings = get_compound_value_of_savings(
        INVESTMENT_AMOUNT_COMPOUND,
        BANK_SAVINGS_INTEREST_RATE,
    )
    
    projected_ltim_earnings = get_projected_ltim_earnings(
        AMOUNT_ALLOCATED_TO_LTIM,
        LTIM_RETURN_RATE,
    )

    remaining_amount = get_remaining_amount(
        total_available_to_invest,
        net_earnings,
        compound_value_of_savings,
        projected_ltim_earnings,
        loss_in_purchasing_power,
        year_data['loan_repayments'],
        year_data['future_expenses_in_year'],
    )

    # Add legacy fields to existing data
    data[i].update({
        # Legacy fields for compatibility
        "starting_balance": year_data['opening_balance'],
        "yearly_collections": yearly_collections,
        "total_available_to_invest": total_available_to_invest,
        "total_amount_invested": total_amount_invested,
        "net_earnings": net_earnings,
        "projected_ltim_earnings": projected_ltim_earnings,
        "loss_in_purchasing_power": loss_in_purchasing_power,
        "loan_payments": year_data['loan_repayments'],  # renamed for consistency
        "expenses": year_data['future_expenses_in_year'],
        "compound_value_of_savings": compound_value_of_savings,
        "remaining_amount": remaining_amount,
        # Store optimized monthly fees used
        "optimized_monthly_fees": optimized_monthly_fees,
    })


# Add test output to verify calculations
if __name__ == "__main__":
    print("=" * 80)
    print("SOCIETY MAINTENANCE MODEL - LOAN AND SAFETY NET SIMULATION")
    print("=" * 80)
    print()
    
    # First, show the expense schedule
    print("EXPENSE SCHEDULE:")
    print("-" * 50)
    spendings, spending_data = calculate_yearly_expenses(MODEL_ITEMS, PERIOD, FISCAL_YEAR)
    
    for year_idx in range(min(10, PERIOD)):  # Show first 10 years
        year = FISCAL_YEAR + year_idx
        items = spending_data[year_idx]
        total = spendings[year_idx]
        
        if total > 0:
            print(f"Year {year} (Year {year_idx + 1}): ${total:,.2f}")
            for item in items:
                print(f"  - {item['name']}: ${item['cost']:,.2f} ({item['type']})")
            print()
    
    print("\nFINANCIAL PROJECTIONS (First 10 Years):")
    print("-" * 80)
    print(f"{'Year':<6} {'Opening':<12} {'Base Maint':<12} {'Expenses':<12} {'Loans':<10} {'Safety Net':<12} {'Closing':<12}")
    print("-" * 80)
    
    for i, year_data in enumerate(data[:10]):  # Show first 10 years
        year = year_data['year']
        opening = year_data['opening_balance']
        base_maint = year_data['base_maintenance']
        expenses = year_data['future_expenses_in_year']
        loan_repay = year_data['loan_repayments']
        safety_net = year_data['safety_net_top_up']
        closing = year_data['closing_balance']
        
        print(f"{year:<6} ${opening:<11,.0f} ${base_maint:<11,.0f} ${expenses:<11,.0f} ${loan_repay:<9,.0f} ${safety_net:<11,.0f} ${closing:<11,.0f}")
    
    print("\nLOAN SUMMARY:")
    print("-" * 40)
    total_loans_taken = sum(row['loan_portion'] for row in data)
    max_active_loans = max(row['active_loans_count'] for row in data)
    print(f"Total loans taken over {PERIOD} years: ${total_loans_taken:,.2f}")
    print(f"Maximum active loans at any time: {max_active_loans}")
    
    print("\nOPTIMIZATION RESULTS:")
    print("-" * 40)
    if OPTIMIZE_MONTHLY_FEES:
        fee_increase_pct = ((optimized_monthly_fees / MONTHLY_FEES - 1) * 100) if MONTHLY_FEES > 0 else 0
        print("Optimization enabled: Yes")
        print(f"Original monthly fees: ${MONTHLY_FEES:,.2f}")
        print(f"Optimized monthly fees: ${optimized_monthly_fees:,.2f}")
        print(f"Fee increase required: {fee_increase_pct:,.1f}%")
        print(f"Minimum balance achieved: ${min_balance_achieved:,.2f}")
        print(f"Total deficits eliminated: ${total_deficits_achieved:,.2f}")
    else:
        print("Optimization enabled: No")
        print(f"Using original monthly fees: ${MONTHLY_FEES:,.2f}")
    
    print("\nKEY PARAMETERS:")
    print("-" * 30)
    base_annual = (optimized_monthly_fees if OPTIMIZE_MONTHLY_FEES else MONTHLY_FEES) * HOUSING * 12
    print(f"Base maintenance (Year 1): ${base_annual:,.2f}")
    print(f"Inflation rate: {INFLATION_RATE}%")
    print(f"Loan threshold: {LOAN_THRESHOLD_PERCENTAGE}%")
    print(f"Loan interest rate: {LOAN_RATE_PERCENTAGE}%")
    print(f"Safety net percentage: {SAFETY_NET_PERCENTAGE}%")
    print(f"Simulation period: {PERIOD} years")
    print(f"Minimum reserve balance: ${MIN_RESERVE_BALANCE:,.2f}")
    print()
    print("=" * 80)
