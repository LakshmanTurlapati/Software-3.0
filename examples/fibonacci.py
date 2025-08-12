#!/usr/bin/env python3
"""
Fibonacci Sequence Generator

This script provides efficient functions to generate and analyze Fibonacci sequences
using iterative algorithms for optimal performance.

The Fibonacci sequence is defined as:
- F(0) = 0
- F(1) = 1
- F(n) = F(n-1) + F(n-2) for n > 1

This creates the sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ...

Author: Software 3.0 Demo
Date: 2025-08-02
"""

def fibonacci_sequence(n):
    """
    Generate the first n numbers in the Fibonacci sequence.
    
    Uses an iterative approach for optimal performance:
    - Time Complexity: O(n)
    - Space Complexity: O(n) for storage, O(1) for computation
    
    Args:
        n (int): Number of Fibonacci numbers to generate (must be >= 0)
        
    Returns:
        list: List containing the first n Fibonacci numbers
        
    Raises:
        ValueError: If n is negative
        TypeError: If n is not an integer
        
    Examples:
        >>> fibonacci_sequence(5)
        [0, 1, 1, 2, 3]
        
        >>> fibonacci_sequence(10)
        [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
    """
    # Input validation
    if not isinstance(n, int):
        raise TypeError("n must be an integer")
    if n < 0:
        raise ValueError("n must be non-negative")
    
    # Handle edge cases
    if n == 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    # Initialize the sequence with first two numbers
    sequence = [0, 1]
    
    # Generate remaining numbers iteratively
    a, b = 0, 1
    for i in range(2, n):
        next_fib = a + b
        sequence.append(next_fib)
        a, b = b, next_fib  # Move window forward efficiently
    
    return sequence


def fibonacci_up_to(max_value):
    """
    Generate Fibonacci numbers up to a specified maximum value.
    
    Args:
        max_value (int): Maximum value for Fibonacci numbers (must be >= 0)
        
    Returns:
        list: List of Fibonacci numbers not exceeding max_value
        
    Raises:
        ValueError: If max_value is negative
        TypeError: If max_value is not a number
        
    Examples:
        >>> fibonacci_up_to(10)
        [0, 1, 1, 2, 3, 5, 8]
        
        >>> fibonacci_up_to(100)
        [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
    """
    # Input validation
    if not isinstance(max_value, (int, float)):
        raise TypeError("max_value must be a number")
    if max_value < 0:
        raise ValueError("max_value must be non-negative")
    
    # Handle edge case
    if max_value < 0:
        return []
    
    sequence = []
    a, b = 0, 1
    
    # Generate sequence while numbers don't exceed max_value
    while a <= max_value:
        sequence.append(a)
        a, b = b, a + b
    
    return sequence


def find_nth_fibonacci(n):
    """
    Find the nth Fibonacci number (0-indexed) without storing the entire sequence.
    
    This is memory-efficient for finding individual Fibonacci numbers.
    
    Args:
        n (int): Position in sequence (0-indexed, must be >= 0)
        
    Returns:
        int: The nth Fibonacci number
        
    Raises:
        ValueError: If n is negative
        TypeError: If n is not an integer
        
    Examples:
        >>> find_nth_fibonacci(5)
        5
        
        >>> find_nth_fibonacci(10)
        55
        
        >>> find_nth_fibonacci(20)
        6765
    """
    if not isinstance(n, int):
        raise TypeError("n must be an integer")
    if n < 0:
        raise ValueError("n must be non-negative")
    
    # Base cases
    if n <= 1:
        return n
    
    # Iterative calculation without storing sequence
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    
    return b


def is_fibonacci_number(num):
    """
    Check if a number is a Fibonacci number using mathematical property.
    
    A positive integer n is a Fibonacci number if and only if
    one of (5*n^2 + 4) or (5*n^2 - 4) is a perfect square.
    
    Args:
        num (int): Number to check
        
    Returns:
        bool: True if num is a Fibonacci number, False otherwise
        
    Examples:
        >>> is_fibonacci_number(8)
        True
        
        >>> is_fibonacci_number(10)
        False
        
        >>> is_fibonacci_number(21)
        True
    """
    if not isinstance(num, (int, float)):
        return False
    if num < 0:
        return False
    
    def is_perfect_square(n):
        """Check if a number is a perfect square."""
        if n < 0:
            return False
        root = int(n ** 0.5)
        return root * root == n
    
    # Mathematical property of Fibonacci numbers
    return (is_perfect_square(5 * num * num + 4) or 
            is_perfect_square(5 * num * num - 4))


def fibonacci_ratio_analysis(n):
    """
    Analyze the ratio between consecutive Fibonacci numbers.
    
    As n approaches infinity, the ratio F(n+1)/F(n) approaches
    the golden ratio φ ≈ 1.618033988749...
    
    Args:
        n (int): Number of Fibonacci numbers to analyze
        
    Returns:
        dict: Analysis results including ratios and golden ratio approximation
    """
    if n < 2:
        return {"error": "Need at least 2 numbers for ratio analysis"}
    
    sequence = fibonacci_sequence(n)
    ratios = []
    
    # Calculate ratios between consecutive numbers
    for i in range(1, len(sequence)):
        if sequence[i-1] != 0:  # Avoid division by zero
            ratio = sequence[i] / sequence[i-1]
            ratios.append(ratio)
    
    # Golden ratio for comparison
    golden_ratio = (1 + 5**0.5) / 2
    
    return {
        "sequence": sequence,
        "ratios": ratios,
        "golden_ratio": golden_ratio,
        "final_ratio": ratios[-1] if ratios else None,
        "convergence_error": abs(ratios[-1] - golden_ratio) if ratios else None
    }


def main():
    """
    Demonstration of all Fibonacci functions with comprehensive examples.
    """
    print("=" * 60)
    print("         FIBONACCI SEQUENCE GENERATOR")
    print("=" * 60)
    
    # Demo 1: Basic sequence generation
    print("\n1. BASIC SEQUENCE GENERATION")
    print("-" * 30)
    for n in [5, 8, 12]:
        result = fibonacci_sequence(n)
        print(f"First {n} Fibonacci numbers: {result}")
    
    # Demo 2: Generate up to maximum value
    print("\n2. GENERATE UP TO MAXIMUM VALUE")
    print("-" * 35)
    for max_val in [50, 100, 1000]:
        result = fibonacci_up_to(max_val)
        print(f"Fibonacci numbers ≤ {max_val}: {result}")
        print(f"   Count: {len(result)} numbers")
    
    # Demo 3: Find specific positions
    print("\n3. FIND SPECIFIC FIBONACCI NUMBERS")
    print("-" * 38)
    positions = [10, 15, 20, 25]
    for pos in positions:
        fib_num = find_nth_fibonacci(pos)
        print(f"F({pos}) = {fib_num:,}")
    
    # Demo 4: Test Fibonacci number identification
    print("\n4. FIBONACCI NUMBER IDENTIFICATION")
    print("-" * 38)
    test_numbers = [1, 2, 4, 5, 8, 10, 13, 16, 21, 34, 50, 55, 89, 100]
    fibonacci_nums = [num for num in test_numbers if is_fibonacci_number(num)]
    non_fibonacci = [num for num in test_numbers if not is_fibonacci_number(num)]
    
    print(f"Fibonacci numbers: {fibonacci_nums}")
    print(f"Non-Fibonacci numbers: {non_fibonacci}")
    
    # Demo 5: Golden ratio analysis
    print("\n5. GOLDEN RATIO CONVERGENCE ANALYSIS")
    print("-" * 40)
    analysis = fibonacci_ratio_analysis(15)
    print(f"Golden ratio (φ): {analysis['golden_ratio']:.10f}")
    print(f"Final ratio F(15)/F(14): {analysis['final_ratio']:.10f}")
    print(f"Convergence error: {analysis['convergence_error']:.2e}")
    
    print(f"\nRatio progression (last 5):")
    for i, ratio in enumerate(analysis['ratios'][-5:], len(analysis['ratios'])-4):
        error = abs(ratio - analysis['golden_ratio'])
        print(f"   F({i+1})/F({i}) = {ratio:.8f} (error: {error:.2e})")
    
    # Demo 6: Performance test
    print("\n6. PERFORMANCE ANALYSIS")
    print("-" * 25)
    import time
    
    # Test sequence generation
    start_time = time.perf_counter()
    large_sequence = fibonacci_sequence(1000)
    end_time = time.perf_counter()
    
    print(f"Generated 1000 Fibonacci numbers in {(end_time - start_time)*1000:.3f} ms")
    print(f"Largest number: {large_sequence[-1]:,}")
    print(f"Number of digits in F(999): {len(str(large_sequence[-1]))}")
    
    # Test individual number finding
    start_time = time.perf_counter()
    big_fib = find_nth_fibonacci(100)
    end_time = time.perf_counter()
    
    print(f"Found F(100) = {big_fib:,} in {(end_time - start_time)*1000:.3f} ms")
    
    # Demo 7: Mathematical properties
    print("\n7. MATHEMATICAL PROPERTIES")
    print("-" * 30)
    
    # Binet's formula comparison (for smaller numbers)
    def binet_formula(n):
        """Calculate Fibonacci number using Binet's formula (approximate for large n)."""
        phi = (1 + 5**0.5) / 2
        psi = (1 - 5**0.5) / 2
        return round((phi**n - psi**n) / 5**0.5)
    
    print("Comparison with Binet's formula:")
    for n in [10, 15, 20]:
        iterative = find_nth_fibonacci(n)
        binet = binet_formula(n)
        match = "✓" if iterative == binet else "✗"
        print(f"   F({n}): Iterative={iterative:,}, Binet={binet:,} {match}")
    
    print("\n" + "=" * 60)
    print("                DEMO COMPLETE")
    print("=" * 60)
    
    # Optional: Interactive mode
    interactive_mode = input("\nRun interactive mode? (y/n): ").lower().strip()
    if interactive_mode == 'y':
        run_interactive_mode()


def run_interactive_mode():
    """
    Interactive mode for user to explore Fibonacci numbers.
    """
    print("\n" + "=" * 50)
    print("         INTERACTIVE FIBONACCI EXPLORER")
    print("=" * 50)
    print("Commands:")
    print("  seq <n>     - Generate first n Fibonacci numbers")
    print("  upto <max>  - Generate numbers up to max value")
    print("  find <n>    - Find the nth Fibonacci number")
    print("  check <num> - Check if number is Fibonacci")
    print("  ratio <n>   - Analyze ratios for first n numbers")
    print("  quit        - Exit interactive mode")
    print("-" * 50)
    
    while True:
        try:
            user_input = input("\nfib> ").strip().split()
            
            if not user_input:
                continue
                
            command = user_input[0].lower()
            
            if command == 'quit':
                print("Goodbye!")
                break
            elif command == 'seq' and len(user_input) == 2:
                n = int(user_input[1])
                result = fibonacci_sequence(n)
                print(f"First {n} Fibonacci numbers: {result}")
            elif command == 'upto' and len(user_input) == 2:
                max_val = int(user_input[1])
                result = fibonacci_up_to(max_val)
                print(f"Fibonacci numbers ≤ {max_val}: {result}")
                print(f"Count: {len(result)} numbers")
            elif command == 'find' and len(user_input) == 2:
                n = int(user_input[1])
                result = find_nth_fibonacci(n)
                print(f"F({n}) = {result:,}")
            elif command == 'check' and len(user_input) == 2:
                num = int(user_input[1])
                is_fib = is_fibonacci_number(num)
                status = "is" if is_fib else "is not"
                print(f"{num} {status} a Fibonacci number")
            elif command == 'ratio' and len(user_input) == 2:
                n = int(user_input[1])
                analysis = fibonacci_ratio_analysis(n)
                if 'error' in analysis:
                    print(analysis['error'])
                else:
                    print(f"Golden ratio: {analysis['golden_ratio']:.8f}")
                    print(f"Final ratio: {analysis['final_ratio']:.8f}")
                    print(f"Error: {analysis['convergence_error']:.2e}")
            else:
                print("Invalid command. Type 'quit' to exit.")
                
        except (ValueError, IndexError):
            print("Invalid input. Please check your command and try again.")
        except KeyboardInterrupt:
            print("\nInterrupted. Goodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    # Run the main demonstration
    main()